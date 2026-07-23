import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CustomerShell } from "@/components/move/customer-shell";
import {
  OrderWorkspace,
  type CustomerOrderState,
} from "@/components/move/order-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireUnpaidOrder } from "@/lib/order-expiry";
import { CUSTOMER_ORDER_LABEL } from "@/lib/order-state-machine";
import {
  customerPaymentInstruction,
  type CustomerPaymentInstruction,
} from "@/lib/payment-instructions";

export const metadata: Metadata = {
  title: "Track move",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const [{ reference }, session] = await Promise.all([params, getSession()]);
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect("/auth/customer");
  }
  await expireUnpaidOrder(reference, session.user.customer.id);
  const order = await db.order.findFirst({
    where: { reference, customerId: session.user.customer.id },
    include: {
      sourcePaymentMethod: { include: { wallet: true } },
      destinationPaymentMethod: { include: { wallet: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
      settlementAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();

  const payment = order.paymentAttempts[0] ?? null;
  const settlement = order.settlementAttempts[0] ?? null;
  let instruction: CustomerPaymentInstruction | null = null;
  let instructionError: string | null = null;
  if (payment && order.status === "AWAITING_PAYMENT") {
    try {
      instruction = customerPaymentInstruction({
        reference: order.reference,
        rail: payment.rail,
        amount: payment.amount,
        currency: payment.currency,
        instructionsEncrypted: payment.instructionsEncrypted,
        expiresAt: payment.expiresAt,
      });
    } catch {
      instructionError =
        "Secure payment instructions are temporarily unavailable. Do not pay from any other source.";
    }
  }

  const initialState: CustomerOrderState = {
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
  };

  return (
    <CustomerShell active="Orders">
      <OrderWorkspace
        truth={{
          reference: order.reference,
          direction: order.direction as "INR_TO_USDT" | "USDT_TO_INR",
          sendAmount: order.sendAmount.toString(),
          sendCurrency: order.sendCurrency as "INR" | "USDT",
          receiveAmount: order.receiveAmount.toString(),
          receiveCurrency: order.receiveCurrency as "INR" | "USDT",
          rate: order.rate.toString(),
          feeAmount: order.feeAmount.toString(),
          feeCurrency: order.feeCurrency as "INR" | "USDT",
          sourceMasked: order.sourcePaymentMethod.maskedLabel,
          destinationMasked: order.destinationPaymentMethod.maskedLabel,
          destinationNetwork: order.destinationPaymentMethod.wallet?.network ?? null,
          createdAt: order.createdAt.toISOString(),
        }}
        initialState={initialState}
        instruction={instruction}
        instructionError={instructionError}
      />
    </CustomerShell>
  );
}
