import type { Metadata } from "next";
import Link from "next/link";
import { updateRevenueStatus } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, FormError, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDate, money, revenueTypeLabel, statusLabel } from "@/lib/format";
import { REVENUE_STATUSES } from "@/lib/options";

export const metadata: Metadata = { title: "Revenue" };

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [records, groups] = await Promise.all([
    db.revenueRecord.findMany({
      include: {
        request: { include: { company: true } },
        company: true,
        match: { include: { partner: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.revenueRecord.groupBy({ by: ["status", "currency"], _sum: { amount: true } }),
  ]);

  const totals = REVENUE_STATUSES.map((status) => ({
    status,
    parts: groups
      .filter((g) => g.status === status && g._sum.amount !== null)
      .map((g) => money(g._sum.amount!.toString(), g.currency)),
  }));

  return (
    <>
      <PageHeader
        title="Revenue ledger"
        sub="Introduction and coordination fees — from potential to paid. INRP2P earns on introductions, never on spreads."
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {totals.map((t) => (
          <Stat
            key={t.status}
            label={statusLabel(t.status)}
            value={t.parts.length ? t.parts.join(" + ") : "—"}
            tone={t.status === "PAID" ? "emerald" : t.status === "POTENTIAL" ? "gold" : "default"}
          />
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Request</th>
                  <th>Company</th>
                  <th>Via partner</th>
                  <th>Type</th>
                  <th>Payer</th>
                  <th>Amount</th>
                  <th>Basis</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                    <td>
                      {r.request ? (
                        <Link
                          href={`/admin/requests/${r.requestId}`}
                          className="font-mono text-xs text-gold-700 hover:underline"
                        >
                          {r.request.reference}
                        </Link>
                      ) : (
                        <span className="chip border-gold-500/25 bg-gold-500/[0.06] text-[10px] text-gold-700">
                          Retainer
                        </span>
                      )}
                    </td>
                    <td className="font-medium text-slate-800">
                      {r.request ? r.request.company.companyName : (r.company?.companyName ?? "—")}
                    </td>
                    <td className="text-xs">{r.match ? r.match.partner.displayName : "—"}</td>
                    <td className="text-xs">{revenueTypeLabel(r.type)}</td>
                    <td className="max-w-40 text-xs">
                      {r.payerName ? `${r.payerType ? `${r.payerType} · ` : ""}${r.payerName}` : "—"}
                    </td>
                    <td className="whitespace-nowrap font-semibold tabular-nums text-slate-900">
                      {money(r.amount.toString(), r.currency)}
                    </td>
                    <td className="max-w-56 text-xs">{r.basis ?? "—"}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-slate-400">
                      {[
                        r.dueDate ? `due ${fmtDate(r.dueDate)}` : null,
                        r.invoicedAt ? `inv ${fmtDate(r.invoicedAt)}` : null,
                        r.paidAt ? `paid ${fmtDate(r.paidAt)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td>
                      <form action={updateRevenueStatus} className="flex items-center gap-1.5">
                        <input type="hidden" name="revenueId" value={r.id} />
                        <input type="hidden" name="back" value="/admin/revenue" />
                        <select name="status" defaultValue={r.status} className="input h-8 w-auto py-0 text-xs">
                          {REVENUE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {statusLabel(s)}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                          Set
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No revenue records yet"
              body="Revenue is tracked only after a review, access, intro, retainer or success fee is discussed. Record one from a request's detail page and the ledger will track it from potential through to paid."
            />
          </div>
        )}
      </div>
    </>
  );
}
