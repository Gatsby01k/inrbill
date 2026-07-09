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
    payment_link?: { entity?: { id?: string } };
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

  const linkId = payload.payload?.payment_link?.entity?.id;
  const paymentId = payload.payload?.payment?.entity?.id;
  if (!linkId) {
    console.error("Razorpay webhook payment_link.paid missing payment_link id", payload);
    return NextResponse.json({ ok: true });
  }

  const record = await db.revenueRecord.findFirst({ where: { paymentLinkId: linkId } });
  if (!record) {
    console.error("Razorpay webhook: no RevenueRecord matches payment link", linkId);
    return NextResponse.json({ ok: true });
  }

  // Idempotent — Razorpay retries webhooks on non-2xx, and this event can in
  // principle arrive more than once for the same link.
  if (record.status !== "PAID") {
    await db.revenueRecord.update({
      where: { id: record.id },
      data: {
        status: "PAID",
        paidAt: record.paidAt ?? new Date(),
        paymentRef: paymentId ?? record.paymentRef,
      },
    });
    await audit({
      action: "revenue.paid_via_razorpay",
      entityType: "RevenueRecord",
      entityId: record.id,
      actorId: null,
      actorLabel: "Razorpay webhook",
      requestId: record.requestId,
      matchId: record.matchId,
      meta: { paymentLinkId: linkId, paymentRef: paymentId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
