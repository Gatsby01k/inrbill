import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Transaction orders" };
export const dynamic = "force-dynamic";

const QUEUES = [
  { label: "Needs action", statuses: ["NEEDS_REVIEW", "DISPUTED", "FAILED"] },
  { label: "Payment submitted", statuses: ["PAYMENT_SUBMITTED", "PAYMENT_DETECTED"] },
  { label: "Ready to settle", statuses: ["PAYMENT_CONFIRMED", "SETTLEMENT_PENDING"] },
  { label: "In flight", statuses: ["SETTLEMENT_IN_PROGRESS", "SETTLEMENT_SENT", "CONFIRMING"] },
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const selected = QUEUES.find((item) => item.label.toLowerCase().replaceAll(" ", "-") === queue);
  const orders = await db.order.findMany({
    where: selected ? { status: { in: [...selected.statuses] } } : undefined,
    include: {
      customer: { include: { user: { select: { email: true, name: true } } } },
      sourcePaymentMethod: { select: { maskedLabel: true } },
      destinationPaymentMethod: { select: { maskedLabel: true } },
      reconciliation: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 150,
  });
  const groups = await db.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const count = (statuses: readonly string[]) =>
    groups
      .filter((group) => statuses.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);

  return (
    <>
      <PageHeader
        title="Orders"
        sub="One customer order; internal legs, assignment and settlement controls stay here."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUEUES.map((item) => {
          const slug = item.label.toLowerCase().replaceAll(" ", "-");
          return (
            <Link
              key={item.label}
              href={`/admin/orders?queue=${slug}`}
              className="card p-4"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {item.label}
              </span>
              <strong className="mt-2 block text-2xl font-semibold text-slate-900">
                {count(item.statuses)}
              </strong>
            </Link>
          );
        })}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {selected?.label ?? "All recent orders"}
          </h2>
          {selected ? <Link href="/admin/orders" className="text-xs text-slate-500 hover:text-gold-700">Clear filter</Link> : null}
        </div>
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-black/[0.025] text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order / customer</th>
                  <th className="px-4 py-3">Move</th>
                  <th className="px-4 py-3">Methods</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reconciliation</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.reference}`} className="font-semibold text-slate-900 hover:text-gold-700">
                        {order.reference}
                      </Link>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {order.customer.user.name} · {order.customer.user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 tnum">
                      <strong className="text-slate-800">
                        {money(order.sendAmount.toString(), order.sendCurrency)}
                      </strong>
                      <span className="mx-1.5 text-gold-700">→</span>
                      <strong className="text-slate-800">
                        {money(order.receiveAmount.toString(), order.receiveCurrency)}
                      </strong>
                    </td>
                    <td className="px-4 py-3 text-[10.5px] text-slate-600">
                      {order.sourcePaymentMethod.maskedLabel}
                      <span className="mx-1 text-slate-400">→</span>
                      {order.destinationPaymentMethod.maskedLabel}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={order.reconciliation?.status ?? "PENDING"} /></td>
                    <td className="px-4 py-3 text-[10px] text-slate-500">{fmtDateTime(order.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No orders in this queue" body="Only real transaction orders appear here." />
          </div>
        )}
      </section>
    </>
  );
}
