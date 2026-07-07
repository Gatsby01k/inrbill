import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { Timeline } from "@/components/workspace/timeline";
import { db } from "@/lib/db";
import { auditLabel, cn, directionLabel, fmtDate, money, statusLabel } from "@/lib/format";
import {
  INTRODUCTION_STATUSES,
  MATCH_STATUSES,
  PARTNER_STATUSES,
  REQUEST_STATUSES,
  REVENUE_STATUSES,
} from "@/lib/options";

export const metadata: Metadata = { title: "Operations dashboard" };

type CountGroup = { status: string; _count: { _all: number } };

const countOf = (groups: CountGroup[], status: string) =>
  groups.find((g) => g.status === status)?._count._all ?? 0;

export default async function AdminDashboard() {
  const [
    reqGroups,
    ptrGroups,
    matchGroups,
    introGroups,
    revGroups,
    recentRequests,
    recentPartners,
    recentAudit,
  ] = await Promise.all([
    db.liquidityRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.partnerProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    db.match.groupBy({ by: ["status"], _count: { _all: true } }),
    db.introduction.groupBy({ by: ["status"], _count: { _all: true } }),
    db.revenueRecord.groupBy({ by: ["status", "currency"], _sum: { amount: true } }),
    db.liquidityRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true },
    }),
    db.partnerProfile.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const totalRequests = reqGroups.reduce((n, g) => n + g._count._all, 0);
  const totalPartners = ptrGroups.reduce((n, g) => n + g._count._all, 0);

  const revenueLines = REVENUE_STATUSES.map((status) => ({
    status,
    parts: revGroups
      .filter((g) => g.status === status && g._sum.amount !== null)
      .map((g) => money(g._sum.amount!.toString(), g.currency)),
  }));

  return (
    <>
      <PageHeader
        title="Pipeline dashboard"
        sub="Live state of requests, partners, matching and revenue."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/requests" className="btn btn-ghost btn-sm">
              All requests
            </Link>
            <Link href="/admin/partners" className="btn btn-gold btn-sm">
              All partners
            </Link>
          </div>
        }
      />

      <SectionTitle title={`Requests · ${totalRequests}`} />
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-black/[0.06] sm:grid-cols-3 xl:grid-cols-6">
          {REQUEST_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/requests?status=${s}`}
              className="bg-white px-4 py-3.5 transition-colors hover:bg-[#FAF6EC]"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {statusLabel(s)}
              </p>
              <p
                className={cn(
                  "tnum mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.01em]",
                  s === "INTRODUCED"
                    ? "text-gold-700"
                    : s === "CLOSED"
                      ? "text-emerald-700"
                      : "text-slate-900",
                )}
              >
                {countOf(reqGroups, s)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <SectionTitle title={`Partners · ${totalPartners}`} className="mt-8" />
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-black/[0.06] sm:grid-cols-3 xl:grid-cols-6">
          {PARTNER_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/partners?status=${s}`}
              className="bg-white px-4 py-3.5 transition-colors hover:bg-[#FAF6EC]"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {statusLabel(s)}
              </p>
              <p
                className={cn(
                  "tnum mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.01em]",
                  s === "VERIFIED" ? "text-emerald-700" : "text-slate-900",
                )}
              >
                {countOf(ptrGroups, s)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <SectionTitle title="Matches" />
          <div className="space-y-2.5">
            {MATCH_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="text-sm font-semibold tabular-nums text-slate-800">
                  {countOf(matchGroups, s)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <SectionTitle title="Introductions" />
          <div className="space-y-2.5">
            {INTRODUCTION_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="text-sm font-semibold tabular-nums text-slate-800">
                  {countOf(introGroups, s)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <SectionTitle
            title="Revenue"
            action={
              <Link href="/admin/revenue" className="text-xs font-medium text-gold-600 hover:underline">
                Open ledger →
              </Link>
            }
          />
          <div className="space-y-2.5">
            {revenueLines.map((line) => (
              <div key={line.status} className="flex items-start justify-between gap-3">
                <StatusBadge status={line.status} />
                <span className="text-right text-sm font-semibold tabular-nums text-slate-800">
                  {line.parts.length ? line.parts.join(" + ") : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <SectionTitle
            title="Latest requests"
            action={
              <Link href="/admin/requests" className="text-xs font-medium text-gold-600 hover:underline">
                View all →
              </Link>
            }
          />
          {recentRequests.length ? (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Company</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((r) => (
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
                      <td>{directionLabel(r.direction)}</td>
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
            <EmptyState
              title="No requests yet"
              body="New company requests land here the moment they are submitted."
            />
          )}
        </div>

        <div className="card p-5">
          <SectionTitle
            title="Latest partner applications"
            action={
              <Link href="/admin/partners" className="text-xs font-medium text-gold-600 hover:underline">
                View all →
              </Link>
            }
          />
          {recentPartners.length ? (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Partner</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPartners.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/admin/partners/${p.id}`}
                          className="font-mono text-xs text-emerald-700 hover:underline"
                        >
                          {p.reference}
                        </Link>
                      </td>
                      <td className="font-medium text-slate-800">{p.displayName}</td>
                      <td className="text-xs">{p.dailyCapacityBand}</td>
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
            <EmptyState
              title="No applications yet"
              body="Partner applications appear here for review and verification."
            />
          )}
        </div>
      </div>

      <div className="card mt-8 p-5">
        <SectionTitle
          title="Recent activity"
          action={
            <Link href="/admin/audit" className="text-xs font-medium text-gold-600 hover:underline">
              Full audit log →
            </Link>
          }
        />
        <Timeline
          items={recentAudit.map((a) => ({
            id: a.id,
            when: a.createdAt,
            label: auditLabel(a.action, a.meta),
            actor: a.actorLabel,
          }))}
        />
      </div>
    </>
  );
}
