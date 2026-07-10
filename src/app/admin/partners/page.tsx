import type { Metadata } from "next";
import Link from "next/link";
import type { PartnerStatus, Prisma } from "@prisma/client";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { TrackRecordBadge } from "@/components/workspace/track-record";
import { db } from "@/lib/db";
import { cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { PARTNER_STATUSES } from "@/lib/options";
import { getPartnerTrackRecords } from "@/lib/reputation";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ai?: string }>;
}) {
  const { status, q, ai } = await searchParams;
  const statusFilter = (PARTNER_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as PartnerStatus)
    : undefined;
  const aiFlaggedFilter = ai === "flagged";

  const where: Prisma.PartnerProfileWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(aiFlaggedFilter ? { aiFlagged: true } : {}),
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
  const trackRecords = await getPartnerTrackRecords(partners.map((p) => p.id));

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
        <Link
          href={`/admin/partners?${new URLSearchParams({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(aiFlaggedFilter ? {} : { ai: "flagged" }),
          }).toString()}`}
          className={cn("pill", aiFlaggedFilter && "pill-active")}
          title="Applications the AI vetting pipeline flagged for a second look"
        >
          🚩 AI flagged
        </Link>
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
                  <th>Track record</th>
                  <th>AI</th>
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
                    <td className="max-w-56">
                      <TrackRecordBadge
                        record={
                          trackRecords.get(p.id) ?? {
                            totalIntroductions: 0,
                            successfulIntroductions: 0,
                            failedIntroductions: 0,
                            successRate: null,
                            avgResponseHours: null,
                          }
                        }
                      />
                    </td>
                    <td>
                      {p.aiFlagged === true ? (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                          Flagged
                        </span>
                      ) : p.aiFlagged === false ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          Clear
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
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
