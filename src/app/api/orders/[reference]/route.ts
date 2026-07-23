import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireUnpaidOrder } from "@/lib/order-expiry";
import { CUSTOMER_ORDER_LABEL } from "@/lib/order-state-machine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const session = await getSession();
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { reference } = await params;
  await expireUnpaidOrder(reference, session.user.customer.id);

  const order = await db.order.findFirst({
    where: { reference, customerId: session.user.customer.id },
    include: {
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          rail: true,
          utrMasked: true,
          txid: true,
          submittedAt: true,
          detectedAt: true,
          confirmedAt: true,
        },
      },
      settlementAttempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          network: true,
          txid: true,
          payoutReferenceMasked: true,
          sentAt: true,
          detectedAt: true,
          confirmedAt: true,
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const payment = order.paymentAttempts[0] ?? null;
  const settlement = order.settlementAttempts[0] ?? null;
  return NextResponse.json(
    {
      order: {
        reference: order.reference,
        status: order.status,
        statusLabel: CUSTOMER_ORDER_LABEL[order.status],
        version: order.version,
        paymentDeadline: order.paymentDeadline?.toISOString() ?? null,
        paymentSubmittedAt: order.paymentSubmittedAt?.toISOString() ?? null,
        paymentConfirmedAt: order.paymentConfirmedAt?.toISOString() ?? null,
        settlementSentAt: order.settlementSentAt?.toISOString() ?? null,
        completedAt: order.completedAt?.toISOString() ?? null,
        payment: payment
          ? {
              status: payment.status,
              rail: payment.rail,
              utrMasked: payment.utrMasked,
              txid: payment.txid,
              submittedAt: payment.submittedAt?.toISOString() ?? null,
              detectedAt: payment.detectedAt?.toISOString() ?? null,
              confirmedAt: payment.confirmedAt?.toISOString() ?? null,
            }
          : null,
        settlement: settlement
          ? {
              status: settlement.status,
              network: settlement.network,
              txid: settlement.txid,
              payoutReferenceMasked: settlement.payoutReferenceMasked,
              sentAt: settlement.sentAt?.toISOString() ?? null,
              detectedAt: settlement.detectedAt?.toISOString() ?? null,
              confirmedAt: settlement.confirmedAt?.toISOString() ?? null,
            }
          : null,
      },
    },
    {
      headers: {
        "cache-control": "private, no-store, max-age=0",
      },
    },
  );
}
