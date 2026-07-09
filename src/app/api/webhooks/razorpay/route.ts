import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
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
  // Read the RAW body text first — Razorpay signs the exact bytes it sent.
  // Calling req.json() and re-serializing later would break verification,
  // since key order/spacing can differ from what was actually transmitted.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    console.error("Razorpay webhook signature verification failed");
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
    console.error("Razorpay webhook payment_link.paid missing payment_link id", payload);
    return NextResponse.json({ ok: true });
  }

  // paymentLinkId is a unique column, so this can only ever match the one
  // record this link was created for — never a stray duplicate.
  const record = await db.revenueRecord.findUnique({ where: { paymentLinkId: linkId } });
  if (!record) {
    console.error("Razorpay webhook: no RevenueRecord matches payment link", linkId);
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
    console.error("Razorpay webhook payment_link.paid amount/status mismatch — not marking paid", {
      linkId,
      status: link.status,
      amountPaid: link.amount_paid,
      expectedPaise,
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
}
