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
                  <th>Confidence</th>
                  <th>Next action</th>
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
                        className="font-mono text-xs text-gold-700 hover:underline"
                      >
                        {m.request.reference}
                      </Link>
                    </td>
                    <td className="font-medium text-slate-800">{m.request.company.companyName}</td>
                    <td>
                      <Link
                        href={`/admin/partners/${m.partnerId}`}
                        className="font-medium text-slate-800 hover:text-leaf-800"
                      >
                        {m.partner.displayName}
                      </Link>
                    </td>
                    <td className="text-xs">{directionLabel(m.request.direction)}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="tabular-nums text-xs">
                      {m.confidenceScore != null ? `${m.confidenceScore}/100` : "—"}
                    </td>
                    <td className="max-w-40 truncate text-xs" title={m.nextAction ?? ""}>
                      {m.nextAction ?? "—"}
                    </td>
                    <td className="text-xs">
                      <span className={m.releasedToCompany ? "text-leaf-700" : "text-slate-400"}>
                        C{m.releasedToCompany ? " ✓" : " —"}
                      </span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className={m.releasedToPartner ? "text-leaf-700" : "text-slate-400"}>
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
              title={statusFilter ? "No matches with this status" : "No matches created yet"}
              body="Review company requests and verified partners to create a qualified introduction — matches you create appear here across the whole pipeline."
            />
          </div>
        )}
      </div>
    </>
  );
}
