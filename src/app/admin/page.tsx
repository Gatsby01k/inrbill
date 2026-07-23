import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Operations action queue" };
export const dynamic = "force-dynamic";

const QUEUES = [
  { label: "Needs action", statuses: ["NEEDS_REVIEW", "DISPUTED", "FAILED"], tone: "risk" },
  { label: "Payment submitted", statuses: ["PAYMENT_SUBMITTED", "PAYMENT_DETECTED"], tone: "default" },
  { label: "Ready to settle", statuses: ["PAYMENT_CONFIRMED", "SETTLEMENT_PENDING"], tone: "default" },
  { label: "At risk", statuses: ["EXPIRED", "NEEDS_REVIEW", "DISPUTED"], tone: "risk" },
] as const;

export default async function AdminActionQueue() {
  const [groups, nextOrders, completedToday] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.findMany({
      where: {
        status: {
          in: [
            "NEEDS_REVIEW",
            "DISPUTED",
            "FAILED",
            "PAYMENT_SUBMITTED",
            "PAYMENT_DETECTED",
            "PAYMENT_CONFIRMED",
            "SETTLEMENT_PENDING",
            "SETTLEMENT_IN_PROGRESS",
            "SETTLEMENT_SENT",
            "CONFIRMING",
          ],
        },
      },
      include: { customer: { include: { user: true } } },
      orderBy: { updatedAt: "asc" },
      take: 30,
    }),
    db.order.count({
      where: {
        status: "COMPLETED",
        completedAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  const count = (statuses: readonly string[]) =>
    groups
      .filter((group) => statuses.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);

  return (
    <>
      <PageHeader
        title="Action queue"
        sub="What requires an operator next. Analytics and network administration stay in their own sections."
        actions={<Link href="/admin/orders" className="btn btn-gold btn-sm">All orders</Link>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {QUEUES.map((queue) => (
          <Link key={queue.label} href="/admin/orders" className="card p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{queue.label}</span>
            <strong className={queue.tone === "risk" ? "mt-2 block text-2xl text-rose-600" : "mt-2 block text-2xl text-slate-900"}>{count(queue.statuses)}</strong>
          </Link>
        ))}
        <div className="card p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Completed today</span>
          <strong className="mt-2 block text-2xl text-leaf-700">{completedToday}</strong>
        </div>
      </div>

      <section className="mt-6 card overflow-hidden">
        <div className="border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Next required action</h2>
        </div>
        {nextOrders.length ? (
          <div className="divide-y divide-black/[0.06]">
            {nextOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.reference}`} className="grid gap-3 px-5 py-4 transition-colors hover:bg-black/[0.02] sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <strong className="text-xs text-slate-900">{order.reference}</strong>
                  <p className="mt-1 text-[10px] text-slate-500">{order.customer.user.name} · updated {fmtDateTime(order.updatedAt)}</p>
                </div>
                <p className="tnum text-xs text-slate-700">{money(order.sendAmount.toString(), order.sendCurrency)} → {money(order.receiveAmount.toString(), order.receiveCurrency)}</p>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-5"><EmptyState title="No transaction action is waiting" body="New payment and settlement events will appear here." /></div>
        )}
      </section>
    </>
  );
}
