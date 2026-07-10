import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, RequestStatus } from "@prisma/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { cn, fmtDate, requestTypeLabel, statusLabel } from "@/lib/format";
import { REQUEST_STATUSES } from "@/lib/options";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ai?: string }>;
}) {
  const { status, q, ai } = await searchParams;
  const statusFilter = (REQUEST_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as RequestStatus)
    : undefined;
  const aiFlaggedFilter = ai === "flagged";

  const where: Prisma.LiquidityRequestWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(aiFlaggedFilter ? { aiFlagged: true } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { jurisdiction: { contains: q, mode: "insensitive" } },
            { company: { companyName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const requests = await db.liquidityRequest.findMany({
    where,
    include: { company: true, _count: { select: { matches: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Company requests"
        sub="Every INR liquidity request, newest first. Open a request to review, match and introduce."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/requests" className={cn("pill", !statusFilter && "pill-active")}>
          All
        </Link>
        {REQUEST_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/requests?status=${s}`}
            className={cn("pill", statusFilter === s && "pill-active")}
          >
            {statusLabel(s)}
          </Link>
        ))}
        <Link
          href={`/admin/requests?${new URLSearchParams({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(aiFlaggedFilter ? {} : { ai: "flagged" }),
          }).toString()}`}
          className={cn("pill", aiFlaggedFilter && "pill-active")}
          title="Requests the AI triage pipeline flagged for a second look"
        >
          🚩 AI flagged
        </Link>
        <form action="/admin/requests" className="ml-auto flex gap-2">
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search company, ref, jurisdiction…"
            className="input h-9 w-64 py-0"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Daily volume</th>
                  <th>Speed</th>
                  <th>Urgency</th>
                  <th>Jurisdiction</th>
                  <th>Matches</th>
                  <th>AI</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="font-mono text-xs text-gold-700 hover:underline"
                      >
                        {r.reference}
                      </Link>
                    </td>
                    <td className="font-medium text-slate-800">{r.company.companyName}</td>
                    <td className="whitespace-nowrap">{requestTypeLabel(r.requestType)}</td>
                    <td className="text-xs">{r.dailyVolumeBand}</td>
                    <td className="text-xs">{r.requiredSpeed}</td>
                    <td>
                      <StatusBadge status={r.urgency} className="text-[10px]" />
                    </td>
                    <td className="text-xs">{r.jurisdiction}</td>
                    <td className="tabular-nums">{r._count.matches}</td>
                    <td>
                      {r.aiFlagged === true ? (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                          Flagged
                        </span>
                      ) : r.aiFlagged === false ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          Clear
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {fmtDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title={statusFilter || q ? "Nothing matches this filter" : "No requests yet"}
              body={
                statusFilter || q
                  ? "Try clearing the filter or searching for something else."
                  : "Company requests submitted through the public site appear here immediately."
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
