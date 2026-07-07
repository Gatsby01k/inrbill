import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { addCompanyDocument, addCompanyNote } from "@/app/actions/portal";
import { BackLink, EmptyState, FormError, KV, SectionTitle, StatusBadge } from "@/components/ui";
import {
  DocumentComposer,
  DocumentList,
  NoteComposer,
  NoteList,
} from "@/components/workspace/records";
import { Timeline } from "@/components/workspace/timeline";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLabel, cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Request" };

const STEPS = ["SUBMITTED", "IN_REVIEW", "MATCHING", "INTRODUCED", "CLOSED"] as const;

function companyEventLabel(action: string, meta: unknown) {
  if (action === "match.release_changed") {
    return "A reviewed partner introduction was released to you";
  }
  return auditLabel(action, meta);
}

export default async function CompanyRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("COMPANY");
  if (!user.company) redirect("/login");
  const { id } = await params;
  const { error } = await searchParams;

  const request = await db.liquidityRequest.findUnique({
    where: { id },
    include: {
      matches: {
        where: { releasedToCompany: true },
        include: {
          partner: true,
          introductions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      },
      notesList: { where: { visibility: "COMPANY" }, orderBy: { createdAt: "desc" } },
      documents: { where: { visibility: "COMPANY" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!request || request.companyId !== user.company.id) notFound();

  const rawTimeline = await db.auditLog.findMany({
    where: { requestId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const timeline = rawTimeline.filter((a) => {
    if (a.action === "request.submitted" || a.action === "request.status_changed") return true;
    if (a.action === "match.release_changed") {
      const m = (a.meta ?? {}) as { side?: string; released?: boolean };
      return m.side === "company" && m.released === true;
    }
    return false;
  });

  const stepIndex = STEPS.indexOf(request.status as (typeof STEPS)[number]);

  return (
    <>
      <BackLink href="/company" label="My requests" />

      <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-gold-700">{request.reference}</span>
        <h1 className="text-xl font-semibold text-slate-900">{directionLabel(request.direction)}</h1>
        <StatusBadge status={request.status} />
        <span className="text-xs text-slate-500">submitted {fmtDate(request.createdAt)}</span>
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      {/* Progress */}
      <div className="card mb-5 p-5">
        {request.status === "REJECTED" ? (
          <p className="text-sm leading-relaxed text-rose-600">
            This request was not accepted into matching. Check the notes below —
            operations usually explains what would need to change for a resubmission.
          </p>
        ) : (
          <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
            {STEPS.map((s, i) => {
              const reached = stepIndex >= 0 && i <= stepIndex;
              const current = i === stepIndex;
              return (
                <li key={s} className="flex items-center sm:flex-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                      reached
                        ? "border-gold-500/60 bg-gold-500/15 text-gold-700"
                        : "border-black/10 bg-black/[0.02] text-slate-400",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "ml-2.5 text-xs font-medium",
                      current ? "text-gold-700" : reached ? "text-slate-700" : "text-slate-400",
                    )}
                  >
                    {statusLabel(s)}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span
                      className={cn(
                        "mx-3 hidden h-px flex-1 sm:block",
                        i < stepIndex ? "bg-gold-500/40" : "bg-black/10",
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Introduced partners */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Introduced partners" />
            {request.matches.length ? (
              <div className="space-y-3">
                {request.matches.map((m) => (
                  <div key={m.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-sm font-semibold text-slate-900">{m.partner.displayName}</p>
                      <StatusBadge status={m.status} />
                      {m.introductions[0] ? <StatusBadge status={m.introductions[0].status} /> : null}
                    </div>
                    <dl className="kv mt-3 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                      <KV label="Directions">
                        {m.partner.directions.map((d) => directionLabel(d)).join(", ")}
                      </KV>
                      <KV label="Daily capacity">{m.partner.dailyCapacityBand}</KV>
                      <KV label="Working hours">{m.partner.workingHours}</KV>
                      <KV label="Coverage">{m.partner.jurisdictions}</KV>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.partner.banks.map((b) => (
                        <span key={b} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                          {b}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                      The introduction itself is made directly by network operations
                      (email or Telegram). Commercial terms and settlement are agreed
                      strictly between you and the partner.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No introductions released yet"
                body="When review and matching complete, introduced partners appear here with their coverage details."
              />
            )}
          </div>

          {/* Requirement recap */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Your requirement" />
            <dl className="kv grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
              <KV label="Direction">{directionLabel(request.direction)}</KV>
              <KV label="Daily volume">{request.dailyVolumeBand}</KV>
              <KV label="Monthly volume">{request.monthlyVolumeBand}</KV>
              <KV label="Required speed">{request.requiredSpeed}</KV>
              <KV label="Jurisdiction">{request.jurisdiction}</KV>
              <KV label="KYC / KYB">{request.kycReadiness}</KV>
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[...request.banks, ...request.methods].map((x) => (
                <span key={x} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                  {x}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Notes & updates" />
            <div className="mb-4">
              <NoteComposer
                action={addCompanyNote}
                hidden={{ requestId: request.id }}
                placeholder="Message network operations — context, changes, questions…"
              />
            </div>
            <NoteList notes={request.notesList} />
          </div>

          {/* Documents */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Documents" />
            <div className="mb-4">
              <DocumentComposer action={addCompanyDocument} hidden={{ requestId: request.id }} />
            </div>
            <DocumentList documents={request.documents} />
          </div>
        </div>

        {/* Rail */}
        <div className="space-y-5 xl:sticky xl:top-7 xl:self-start">
          <div className="card p-5">
            <SectionTitle title="Timeline" />
            <Timeline
              items={timeline.map((a) => ({
                id: a.id,
                when: a.createdAt,
                label: companyEventLabel(a.action, a.meta),
                actor: a.actorLabel === "Operator" ? "Network operations" : a.actorLabel,
              }))}
            />
          </div>
          <div className="card p-5">
            <SectionTitle title="How introductions work" />
            <p className="text-[13px] leading-relaxed text-slate-500">
              INRP2P never holds or moves funds. We review, match and introduce.
              Once a partner is released here, expect a direct introduction from
              operations — from that point you deal with the partner bilaterally,
              under your own agreements and compliance checks.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
