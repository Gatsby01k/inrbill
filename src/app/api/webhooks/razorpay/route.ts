import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { logError } from "@/lib/error-log";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

// Razorpay calls this whenever a payment_link event fires. Scoped strictly
// to INRP2P's own service-fee collection (RevenueRecord) — it never touches
// the underlying P2P trade funds between company and partner.
//
// Setup in the Razorpay dashboard: Settings → Webhooks → Add New Webhook →
// URL https://<your-domain>/api/webhooks/razorpay → enable the
// "payment_link.paid" event → the secret Razorpay shows you at that point
// goes in RAZORPAY_WEBHOOK_SECRET.
export const dynamic = "force-dynamic";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: { id?: string; status?: string; amount?: number; amount_paid?: number };
    };
    payment?: { entity?: { id?: string } };
  };
};

export async function POST(req: NextRequest) {
  try {
    // Read the RAW body text first — Razorpay signs the exact bytes it sent.
    // Calling req.json() and re-serializing later would break verification,
    // since key order/spacing can differ from what was actually transmitted.
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      await logError({
        error: "Razorpay webhook signature verification failed",
        source: "route:/api/webhooks/razorpay",
        severity: "ERROR",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (payload.event !== "payment_link.paid") {
      // Acknowledge everything else so Razorpay doesn't retry — we only act on
      // the one event this endpoint cares about.
      return NextResponse.json({ ok: true, ignored: payload.event ?? null });
    }

    const link = payload.payload?.payment_link?.entity;
    const paymentId = payload.payload?.payment?.entity?.id;
    const linkId = link?.id;
    if (!linkId) {
      await logError({
        error: "Razorpay webhook payment_link.paid missing payment_link id",
        source: "route:/api/webhooks/razorpay",
        severity: "WARNING",
        meta: { payload: payload as unknown as Record<string, unknown> },
      });
      return NextResponse.json({ ok: true });
    }

    // paymentLinkId is a unique column, so this can only ever match the one
    // record this link was created for — never a stray duplicate.
    const record = await db.revenueRecord.findUnique({ where: { paymentLinkId: linkId } });
    if (!record) {
      await logError({
        error: `Razorpay webhook: no RevenueRecord matches payment link ${linkId}`,
        source: "route:/api/webhooks/razorpay",
        severity: "ERROR",
      });
      return NextResponse.json({ ok: true });
    }

    // Defense in depth: don't just trust the event name — check the link's
    // own reported status and that the amount paid exactly matches what this
    // fee was for. Links are always created with accept_partial: false, so
    // this should never actually mismatch, but a webhook that moves money
    // status on faith alone is exactly the kind of shortcut that costs real
    // money later, so it's verified explicitly rather than assumed.
    const expectedPaise = Math.round(Number(record.amount) * 100);
    if (link.status !== "paid" || link.amount_paid !== expectedPaise) {
      await logError({
        error: `Razorpay webhook payment_link.paid amount/status mismatch for ${linkId} — not marking paid`,
        source: "route:/api/webhooks/razorpay",
        severity: "ERROR",
        meta: {
          linkId,
          status: link.status ?? null,
          amountPaid: link.amount_paid ?? null,
          expectedPaise,
        },
      });
      return NextResponse.json({ ok: true, mismatch: true });
    }

    // Atomic, race-safe idempotency: the WHERE clause itself excludes rows
    // already PAID, so if two webhook deliveries for the same event land at
    // the same instant (Razorpay retries are expected behaviour), only one
    // can ever match and update — the other affects zero rows and skips the
    // audit write below, instead of both writing a duplicate log entry.
    const result = await db.revenueRecord.updateMany({
      where: { id: record.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: record.paidAt ?? new Date(),
        paymentRef: paymentId ?? record.paymentRef,
      },
    });

    if (result.count === 1) {
      await audit({
        action: "revenue.paid_via_razorpay",
        entityType: "RevenueRecord",
        entityId: record.id,
        actorId: null,
        actorLabel: "Razorpay webhook",
        requestId: record.requestId,
        matchId: record.matchId,
        meta: { paymentLinkId: linkId, paymentRef: paymentId ?? null, amountPaise: expectedPaise },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Unexpected exception in a payment webhook — always worth a page, since
    // it can mean a paid fee silently never gets marked PAID.
    await logError({ error: err, source: "route:/api/webhooks/razorpay", severity: "FATAL" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
