import type { Metadata } from "next";
import { CustomerNav } from "@/components/move/customer-nav";
import {
  QuoteWorkspace,
  type RepeatMove,
  type SavedMoveMethod,
} from "@/components/move/quote-workspace";
import { TransactionLanding } from "@/components/move/transaction-landing";
import { SiteFooter } from "@/components/site/footer";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Move INR and USDT",
  description:
    "Enter an amount, see the final INR ↔ USDT quote, confirm, pay and track one clear transaction.",
};

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const [{ quote: quoteState }, session] = await Promise.all([searchParams, getSession()]);
  const customer = session?.user.role === "CUSTOMER" ? session.user.customer : null;

  let repeatMove: RepeatMove | null = null;
  let activeOrder: { reference: string; status: string } | null = null;
  let savedMethods: SavedMoveMethod[] = [];
  if (customer) {
    const [lastCompleted, current, methods] = await Promise.all([
      db.order.findFirst({
        where: { customerId: customer.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        include: {
          sourcePaymentMethod: { select: { maskedLabel: true } },
          destinationPaymentMethod: { select: { maskedLabel: true } },
        },
      }),
      db.order.findFirst({
        where: {
          customerId: customer.id,
          status: {
            notIn: ["COMPLETED", "CANCELLED", "EXPIRED", "FAILED"],
          },
        },
        orderBy: { updatedAt: "desc" },
        select: { reference: true, status: true },
      }),
      db.paymentMethod.findMany({
        where: {
          customerId: customer.id,
          status: { notIn: ["DISABLED", "REJECTED"] },
        },
        orderBy: [
          { isDefaultSend: "desc" },
          { isDefaultReceive: "desc" },
          { createdAt: "asc" },
        ],
        select: {
          label: true,
          maskedLabel: true,
          status: true,
          type: true,
          purpose: true,
          isDefaultSend: true,
          isDefaultReceive: true,
        },
      }),
    ]);
    if (lastCompleted) {
      repeatMove = {
        reference: lastCompleted.reference,
        direction: lastCompleted.direction as "INR_TO_USDT" | "USDT_TO_INR",
        sendAmount: lastCompleted.sendAmount.toString(),
        receiveAmount: lastCompleted.receiveAmount.toString(),
        sourceMasked: lastCompleted.sourcePaymentMethod.maskedLabel,
        destinationMasked: lastCompleted.destinationPaymentMethod.maskedLabel,
      };
    }
    activeOrder = current;
    savedMethods = methods;
  }

  return (
    <div className="move-app move-public-page">
      <CustomerNav
        active="Move"
        authenticated={Boolean(customer)}
        displayName={session?.user.name}
      />
      <main className="move-home">
        <QuoteWorkspace
          authenticated={Boolean(customer)}
          maximumInr={customer?.inrPerOrderLimit?.toString()}
          maximumUsdt={customer?.usdtPerOrderLimit?.toString()}
          repeatMove={repeatMove}
          activeOrder={activeOrder}
          savedMethods={savedMethods}
          initialNotice={
            quoteState === "expired" ? "That quote expired. A fresh quote is ready below." : undefined
          }
        />
      </main>
      <TransactionLanding />
      <SiteFooter />
    </div>
  );
}
