import type { Metadata } from "next";
import Link from "next/link";
import type { MatchStatus } from "@prisma/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { MATCH_STATUSES } from "@/lib/options";

export const metadata: Metadata = { title: "Matches" };

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = (MATCH_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as MatchStatus)
    : undefined;

  const matches = await db.match.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      request: { include: { company: true } },
      partner: true,
      _count: { select: { introductions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Matches"
        sub="Every request–partner pairing across the pipeline. Manage each match from its request."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/matches" className={cn("pill", !statusFilter && "pill-active")}>
          All
        </Link>
        {MATCH_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/matches?status=${s}`}
            className={cn("pill", statusFilter === s && "pill-active")}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {matches.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Company</th>
                  <th>Partner</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Released</th>
                  <th>Intros</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link
                        href={`/admin/requests/${m.requestId}`}
                        className="font-mono text-xs text-gold-300 hover:underline"
                      >
                        {m.request.reference}
                      </Link>
                    </td>
                    <td className="font-medium text-slate-200">{m.request.company.companyName}</td>
                    <td>
                      <Link
                        href={`/admin/partners/${m.partnerId}`}
                        className="font-medium text-slate-200 hover:text-emerald-300"
                      >
                        {m.partner.displayName}
                      </Link>
                    </td>
                    <td className="text-xs">{directionLabel(m.request.direction)}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="text-xs">
                      <span className={m.releasedToCompany ? "text-emerald-300" : "text-slate-600"}>
                        C{m.releasedToCompany ? " ✓" : " —"}
                      </span>
                      <span className="mx-1 text-slate-700">/</span>
                      <span className={m.releasedToPartner ? "text-emerald-300" : "text-slate-600"}>
                        P{m.releasedToPartner ? " ✓" : " —"}
                      </span>
                    </td>
                    <td className="tabular-nums">{m._count.introductions}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title={statusFilter ? "No matches with this status" : "No matches yet"}
              body="Create matches from a request's detail page once partners are verified."
            />
          </div>
        )}
      </div>
    </>
  );
}
