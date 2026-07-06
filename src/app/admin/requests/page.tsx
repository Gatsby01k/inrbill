import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, RequestStatus } from "@prisma/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { REQUEST_STATUSES } from "@/lib/options";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const statusFilter = (REQUEST_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as RequestStatus)
    : undefined;

  const where: Prisma.LiquidityRequestWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
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
                  <th>Direction</th>
                  <th>Daily volume</th>
                  <th>Speed</th>
                  <th>Jurisdiction</th>
                  <th>Matches</th>
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
                        className="font-mono text-xs text-gold-300 hover:underline"
                      >
                        {r.reference}
                      </Link>
                    </td>
                    <td className="font-medium text-slate-200">{r.company.companyName}</td>
                    <td className="whitespace-nowrap">{directionLabel(r.direction)}</td>
                    <td className="text-xs">{r.dailyVolumeBand}</td>
                    <td className="text-xs">{r.requiredSpeed}</td>
                    <td className="text-xs">{r.jurisdiction}</td>
                    <td className="tabular-nums">{r._count.matches}</td>
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
