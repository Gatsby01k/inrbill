import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { providerDepositStatus } from "@/lib/deposit-policy";
import { logError } from "@/lib/error-log";
import { verifyNowPaymentsSignature } from "@/lib/nowpayments";
import { notify } from "@/lib/notify";

// NOWPayments calls this whenever an INRP2P fee invoice or an explicitly
// created partner-reserve invoice changes status. It never handles the
// underlying company ↔ partner transaction leg.
//
// Setup in the NOWPayments dashboard: Store/Payment Settings → set the IPN
// callback URL to https://<your-domain>/api/webhooks/nowpayments, generate
// an IPN secret key there, and put it in NOWPAYMENTS_IPN_SECRET. Also set
// "underpaid payments" to be flagged as partially_paid (not auto-finished)
// — this route only ever trusts an exact "finished" status.
export const dynamic = "force-dynamic";

type NowPaymentsIpnPayload = {
  payment_id?: number | string;
  payment_status?: string;
  order_id?: string;
  price_amount?: number;
  price_currency?: string;
  actually_paid?: number;
  pay_currency?: string;
};

async function handleDepositIpn(payload: NowPaymentsIpnPayload, depositId: string) {
  const deposit = await db.partnerDeposit.findUnique({ where: { id: depositId }, include: { partner: true } });
  if (!deposit) {
    await logError({
      error: `NOWPayments IPN: no PartnerDeposit matches order_id deposit:${depositId}`,
      source: "route:/api/webhooks/nowpayments",
      severity: "ERROR",
    });
    return { ok: true, missingDeposit: true };
  }

  const providerStatus = (payload.payment_status ?? "unknown").toLowerCase();
  const paid = Number(payload.actually_paid ?? 0);
  const expected = Number(deposit.amount);
  const status = providerDepositStatus({ current: deposit.status, providerStatus, paid, expected, payCurrency: payload.pay_currency ?? "" });

  if (providerStatus === "finished" && status !== "CONFIRMED") {
    await logError({
      error: `NOWPayments deposit mismatch for ${deposit.reference} — not crediting reserve`,
      source: "route:/api/webhooks/nowpayments",
      severity: "ERROR",
      meta: { depositId, expected, actuallyPaid: paid, payCurrency: payload.pay_currency ?? null },
    });
  }
  let becameConfirmed = false;
  const becameFinalFailure = ["REJECTED", "EXPIRED"].includes(status) && deposit.status !== status;
  const commonData = {
    providerStatus,
    providerPaymentId: payload.payment_id ? String(payload.payment_id) : deposit.providerPaymentId,
    actualAmount: paid > 0 ? paid : deposit.actualAmount,
  };
  if (status === "CONFIRMED") {
    const result = await db.partnerDeposit.updateMany({
      where: { id: deposit.id, status: { notIn: ["CONFIRMED", "REFUNDED"] } },
      data: { ...commonData, status: "CONFIRMED", confirmedAt: new Date() },
    });
    becameConfirmed = result.count === 1;
    if (!becameConfirmed) await db.partnerDeposit.update({ where: { id: deposit.id }, data: commonData });
  } else {
    await db.partnerDeposit.update({
      where: { id: deposit.id },
      data: { ...commonData, status, refundedAt: status === "REFUNDED" && !deposit.refundedAt ? new Date() : deposit.refundedAt },
    });
  }

  if (becameConfirmed || (status !== "CONFIRMED" && status !== deposit.status)) {
    await audit({
      action: status === "CONFIRMED" ? "deposit.confirmed_via_nowpayments" : "deposit.provider_status_changed",
      entityType: "PartnerDeposit",
      entityId: deposit.id,
      actorId: null,
      actorLabel: "NOWPayments webhook",
      partnerId: deposit.partnerId,
      meta: { from: deposit.status, to: status, providerStatus, paymentId: payload.payment_id ?? null, actuallyPaid: paid },
    });
  }

  if (becameConfirmed) {
    await notify(deposit.partner.userId, {
      title: "USDT reserve confirmed",
      body: `${paid.toFixed(2)} USDT has been credited to your operating reserve.`,
      telegramHtml: `✅ <b>USDT reserve confirmed</b>\n${paid.toFixed(2)} USDT credited.`,
      link: "/partner/deposit",
    });
  } else if (becameFinalFailure) {
    await notify(deposit.partner.userId, {
      title: status === "EXPIRED" ? "Deposit invoice expired" : "Deposit failed",
      body: `Deposit ${deposit.reference} was not credited. Create a new invoice before sending funds.`,
      telegramHtml: `⚠️ <b>${status === "EXPIRED" ? "Deposit invoice expired" : "Deposit failed"}</b>\n${deposit.reference}`,
      link: "/partner/deposit",
    });
  }
  return { ok: true, depositId: deposit.id, status };
}

export async function POST(req: NextRequest) {
  try {
    // Unlike Razorpay, NOWPayments' signature covers the PARSED body with its
    // keys deep-sorted, not the raw bytes — so it's read as JSON directly.
    let payload: NowPaymentsIpnPayload;
    try {
      payload = (await req.json()) as NowPaymentsIpnPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const signature = req.headers.get("x-nowpayments-sig");
    if (!verifyNowPaymentsSignature(payload, signature)) {
      await logError({
        error: "NOWPayments IPN signature verification failed",
        source: "route:/api/webhooks/nowpayments",
        severity: "ERROR",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const orderId = payload.order_id;
    if (orderId?.startsWith("deposit:")) {
      return NextResponse.json(await handleDepositIpn(payload, orderId.slice("deposit:".length)));
    }

    // Only "finished" means NOWPayments itself considers the invoice fully
    // paid. "confirming", "confirmed", "sending" are still in flight, and
    // "partially_paid" means the customer sent less than invoiced — none of
    // these should ever mark a fee as collected.
    if (payload.payment_status !== "finished") {
      return NextResponse.json({ ok: true, ignored: payload.payment_status ?? null });
    }

    // order_id was set to the RevenueRecord's own id at invoice creation, so
    // it doubles as the lookup key — no separate unique external-id column
    // to keep in sync.
    if (!orderId) {
      await logError({
        error: "NOWPayments IPN finished payment missing order_id",
        source: "route:/api/webhooks/nowpayments",
        severity: "WARNING",
        meta: { payload: payload as unknown as Record<string, unknown> },
      });
      return NextResponse.json({ ok: true });
    }

    const record = await db.revenueRecord.findUnique({ where: { id: orderId } });
    if (!record) {
      await logError({
        error: `NOWPayments IPN: no RevenueRecord matches order_id ${orderId}`,
        source: "route:/api/webhooks/nowpayments",
        severity: "ERROR",
      });
      return NextResponse.json({ ok: true });
    }

    // Defense in depth: don't just trust the status field — check the amount
    // actually received against what this fee was invoiced for. A small
    // tolerance (0.5%) absorbs harmless rounding on tiny crypto fractions
    // without accepting a materially short payment as complete.
    const expected = Number(record.amount);
    const paid = payload.actually_paid ?? 0;
    if (!(paid >= expected * 0.995)) {
      await logError({
        error: `NOWPayments IPN amount mismatch for order ${orderId} — not marking paid`,
        source: "route:/api/webhooks/nowpayments",
        severity: "ERROR",
        meta: { orderId, expected, actuallyPaid: paid },
      });
      return NextResponse.json({ ok: true, mismatch: true });
    }

    // Atomic, race-safe idempotency, same pattern as the Razorpay webhook —
    // the WHERE clause itself excludes rows already PAID, so a duplicate IPN
    // delivery for the same event can only ever update the row once.
    const result = await db.revenueRecord.updateMany({
      where: { id: record.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: record.paidAt ?? new Date(),
        cryptoPaymentRef: payload.payment_id ? String(payload.payment_id) : record.cryptoPaymentRef,
      },
    });

    if (result.count === 1) {
      await audit({
        action: "revenue.paid_via_nowpayments",
        entityType: "RevenueRecord",
        entityId: record.id,
        actorId: null,
        actorLabel: "NOWPayments webhook",
        requestId: record.requestId,
        matchId: record.matchId,
        meta: {
          paymentId: payload.payment_id ?? null,
          actuallyPaid: paid,
          payCurrency: payload.pay_currency ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError({ error: err, source: "route:/api/webhooks/nowpayments", severity: "FATAL" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
