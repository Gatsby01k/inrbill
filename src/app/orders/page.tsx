import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/move/customer-shell";
import { getSession } from "@/lib/auth";
import { formatCurrencyAmount } from "@/lib/amount";
import { db } from "@/lib/db";
import { CUSTOMER_ORDER_LABEL } from "@/lib/order-state-machine";

export const metadata: Metadata = {
  title: "Your moves",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect("/auth/customer");
  }
  const orders = await db.order.findMany({
    where: { customerId: session.user.customer.id },
    include: {
      sourcePaymentMethod: { select: { maskedLabel: true } },
      destinationPaymentMethod: { select: { maskedLabel: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <CustomerShell active="Orders">
      <div className="move-page-heading">
        <div>
          <p className="move-eyebrow">Orders</p>
          <h1>Your moves, without the machinery.</h1>
          <p>Every amount and status below comes from the transaction ledger.</p>
        </div>
        <Link href="/" className="move-primary-button">New move</Link>
      </div>

      {orders.length ? (
        <div className="move-order-list">
          {orders.map((order) => (
            <Link href={`/orders/${order.reference}`} key={order.id}>
              <div>
                <span>{order.reference}</span>
                <strong>
                  {formatCurrencyAmount(
                    order.sendAmount.toString(),
                    order.sendCurrency as "INR" | "USDT",
                  )}
                  <i aria-hidden>→</i>
                  {formatCurrencyAmount(
                    order.receiveAmount.toString(),
                    order.receiveCurrency as "INR" | "USDT",
                  )}
                </strong>
                <small>
                  {order.sourcePaymentMethod.maskedLabel} →{" "}
                  {order.destinationPaymentMethod.maskedLabel}
                </small>
              </div>
              <p data-status={order.status}>
                {CUSTOMER_ORDER_LABEL[order.status]} <span aria-hidden>→</span>
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <section className="move-panel move-empty-orders">
          <p className="move-eyebrow">No moves yet</p>
          <h2>Your first move starts with one amount.</h2>
          <Link href="/" className="move-primary-button">Enter amount</Link>
        </section>
      )}
    </CustomerShell>
  );
}
