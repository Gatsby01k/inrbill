import type { Metadata } from "next";
import Link from "next/link";
import type { PartnerStatus, Prisma } from "@prisma/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { PARTNER_STATUSES } from "@/lib/options";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const statusFilter = (PARTNER_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as PartnerStatus)
    : undefined;

  const where: Prisma.PartnerProfileWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { jurisdictions: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const partners = await db.partnerProfile.findMany({
    where,
    include: { _count: { select: { matches: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Liquidity partners"
        sub="Applications and the verified network. Open a partner to review, verify or limit."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/partners" className={cn("pill", !statusFilter && "pill-active")}>
          All
        </Link>
        {PARTNER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/partners?status=${s}`}
            className={cn("pill", statusFilter === s && "pill-active")}
          >
            {statusLabel(s)}
          </Link>
        ))}
        <form action="/admin/partners" className="ml-auto flex gap-2">
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, ref, coverage…"
            className="input h-9 w-64 py-0"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        {partners.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Partner</th>
                  <th>Directions</th>
                  <th>Daily capacity</th>
                  <th>Reserve</th>
                  <th>Hours</th>
                  <th>Matches</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/partners/${p.id}`}
                        className="font-mono text-xs text-leaf-700 hover:underline"
                      >
                        {p.reference}
                      </Link>
                    </td>
                    <td className="font-medium text-slate-800">{p.displayName}</td>
                    <td className="text-xs">
                      {p.directions.map((d) => directionLabel(d)).join(", ")}
                    </td>
                    <td className="text-xs">{p.dailyCapacityBand}</td>
                    <td className="text-xs">{p.reserveBand}</td>
                    <td className="text-xs">{p.workingHours}</td>
                    <td className="tabular-nums">{p._count.matches}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {fmtDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title={statusFilter || q ? "Nothing matches this filter" : "No partner applications yet"}
              body={
                statusFilter || q
                  ? "Try clearing the filter or searching for something else."
                  : "Share the partner review link with operators who support INR payout or liquidity flows — applications land here the moment they're submitted."
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
