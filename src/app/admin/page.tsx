import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, SectionTitle, Stat, StatusBadge } from "@/components/ui";
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

const PIPELINE_REVENUE_STATUSES = ["POTENTIAL", "QUOTED", "AGREED", "INVOICED"] as const;

export const metadata: Metadata = { title: "Operations dashboard" };

type CountGroup = { status: string; _count: { _all: number } };

const countOf = (groups: CountGroup[], status: string) =>
  groups.find((g) => g.status === status)?._count._all ?? 0;

export default async function AdminDashboard() {
  const now = new Date();
  const [
    reqGroups,
    ptrGroups,
    matchGroups,
    introGroups,
    revGroups,
    recentRequests,
    recentPartners,
    recentAudit,
    pendingMatches,
    followUpsDue,
    successfulIntros,
    riskyPartners,
    criticalRequests,
    pipelineTotal,
    paidTotal,
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
    db.match.count({ where: { status: { in: ["SUGGESTED", "SHORTLISTED"] } } }),
    db.introduction.findMany({
      where: { followUpDate: { lte: now }, status: { notIn: ["SUCCESSFUL", "FAILED"] } },
      include: { match: { include: { request: { include: { company: true } }, partner: true } } },
      orderBy: { followUpDate: "asc" },
      take: 8,
    }),
    db.introduction.count({ where: { status: "SUCCESSFUL" } }),
    db.partnerProfile.findMany({
      where: { riskNotes: { not: null }, status: { notIn: ["REJECTED", "SUSPENDED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    db.liquidityRequest.findMany({
      where: { urgency: "CRITICAL", status: { notIn: ["CLOSED", "REJECTED"] } },
      include: { company: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.revenueRecord.groupBy({
      by: ["currency"],
      where: { status: { in: [...PIPELINE_REVENUE_STATUSES] } },
      _sum: { amount: true },
    }),
    db.revenueRecord.groupBy({
      by: ["currency"],
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  const totalRequests = reqGroups.reduce((n, g) => n + g._count._all, 0);
  const totalPartners = ptrGroups.reduce((n, g) => n + g._count._all, 0);
  const highRiskCount = riskyPartners.length + criticalRequests.length;

  const revenueLines = REVENUE_STATUSES.map((status) => ({
    status,
    parts: revGroups
      .filter((g) => g.status === status && g._sum.amount !== null)
      .map((g) => money(g._sum.amount!.toString(), g.currency)),
  }));

  const pipelineParts = pipelineTotal
    .filter((g) => g._sum.amount !== null)
    .map((g) => money(g._sum.amount!.toString(), g.currency));
  const paidParts = paidTotal
    .filter((g) => g._sum.amount !== null)
    .map((g) => money(g._sum.amount!.toString(), g.currency));

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

      <SectionTitle title="Operator queue" />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Link href="/admin/matches?status=SUGGESTED" className="block">
          <Stat label="Pending matches" value={pendingMatches} sub="Suggested + shortlisted" />
        </Link>
        <Stat
          label="Follow-ups due"
          value={followUpsDue.length}
          sub="Introductions past their follow-up date"
          tone={followUpsDue.length ? "gold" : "default"}
        />
        <Stat label="Successful intros" value={successfulIntros} tone="emerald" />
        <Stat
          label="High-risk items"
          value={highRiskCount}
          sub="Flagged partners + critical requests"
          tone={highRiskCount ? "gold" : "default"}
        />
        <Stat
          label="Revenue pipeline"
          value={pipelineParts.length ? pipelineParts.join(" + ") : "—"}
          sub="Potential → invoiced"
        />
        <Stat
          label="Revenue paid"
          value={paidParts.length ? paidParts.join(" + ") : "—"}
          tone="emerald"
        />
      </div>

      {(followUpsDue.length > 0 || highRiskCount > 0) && (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          {followUpsDue.length ? (
            <div className="card p-5">
              <SectionTitle title="Follow-ups due" />
              <ul className="space-y-2.5">
                {followUpsDue.map((intro) => (
                  <li key={intro.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link
                      href={`/admin/requests/${intro.match.requestId}`}
                      className="min-w-0 truncate text-slate-700 hover:text-gold-700"
                    >
                      {intro.match.request.company.companyName} ↔ {intro.match.partner.displayName}
                    </Link>
                    <span className="shrink-0 text-xs text-gold-700">
                      {intro.followUpDate ? fmtDate(intro.followUpDate) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {highRiskCount ? (
            <div className="card p-5">
              <SectionTitle title="High-risk items" />
              <ul className="space-y-2.5">
                {criticalRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="min-w-0 truncate text-slate-700 hover:text-gold-700"
                    >
                      {r.reference} — {r.company.companyName}
                    </Link>
                    <StatusBadge status="CRITICAL" />
                  </li>
                ))}
                {riskyPartners.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link
                      href={`/admin/partners/${p.id}`}
                      className="min-w-0 truncate text-slate-700 hover:text-gold-700"
                    >
                      {p.reference} — {p.displayName}
                    </Link>
                    <span className="shrink-0 text-xs text-rose-600">Risk notes on file</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

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
