import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addCompanyDocument, addCompanyNote } from "@/app/actions/portal";
import { routePrivateOffers } from "@/app/actions/network-os";
import { BackLink, EmptyState, FormError, KV, SectionTitle, StatusBadge } from "@/components/ui";
import {
  DocumentComposer,
  DocumentList,
  NoteComposer,
  NoteList,
} from "@/components/workspace/records";
import { DealProgress, NextStepHint } from "@/components/workspace/deal-progress";
import { Timeline } from "@/components/workspace/timeline";
import { TrackRecordBadge } from "@/components/workspace/track-record";
import { requireRole } from "@/lib/auth";
import { deriveRequestStage } from "@/lib/deal-stage";
import { db } from "@/lib/db";
import { auditLabel, directionLabel, fmtDate, requestTypeLabel } from "@/lib/format";
import { getPartnerTrackRecords } from "@/lib/reputation";
import { Flash } from "@/components/workspace/flash";

export const metadata: Metadata = { title: "Request" };

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
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireRole("COMPANY");
  if (!user.company) redirect("/login");
  const { id } = await params;
  const { error, notice } = await searchParams;

  const request = await db.liquidityRequest.findUnique({
    where: { id },
    include: {
      matches: {
        where: { releasedToCompany: true },
        include: {
          partner: true,
          introductions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { _count: { select: { messages: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      notesList: { where: { visibility: "COMPANY" }, orderBy: { createdAt: "desc" } },
      documents: { where: { visibility: "COMPANY" }, orderBy: { createdAt: "desc" } },
      matchOffers: { include: { partner: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!request || request.companyId !== user.company.id) notFound();

  const trackRecords = await getPartnerTrackRecords(request.matches.map((m) => m.partnerId));

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

  const stage = deriveRequestStage(
    request.status,
    request.matches.map((m) => ({
      matchStatus: m.status,
      releasedToCompany: true,
      releasedToPartner: m.releasedToPartner,
      introStatus: m.introductions[0]?.status ?? null,
      hasMessages: (m.introductions[0]?._count.messages ?? 0) > 0,
    })),
  );

  return (
    <>
      <BackLink href="/company" label="My requests" />

      <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-gold-700">{request.reference}</span>
        <h1 className="text-xl font-semibold text-slate-900">{requestTypeLabel(request.requestType)}</h1>
        <StatusBadge status={request.status} />
        <StatusBadge status={request.urgency} />
        <span className="text-xs text-slate-500">submitted {fmtDate(request.createdAt)}</span>
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}
      <Flash notice={notice} />

      {/* Progress */}
      <div className="card mb-5 space-y-4 p-5">
        <DealProgress stage={stage} />
        <NextStepHint stage={stage} role="company" />
      </div>

      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-3"><div><h2 className="text-sm font-semibold">Controlled private routing</h2><p className="mt-1 text-xs text-slate-500">Sends a 30-minute offer only to connected partners with approved verification and live capacity.</p></div>{request.routingEnabled ? <form action={routePrivateOffers} className="ml-auto"><input type="hidden" name="requestId" value={request.id} /><button className="btn btn-gold btn-sm">Route top verified fits</button></form> : <StatusBadge status="MANUAL_ONLY" />}</div>{request.matchOffers.length ? <div className="mt-4 flex flex-wrap gap-2">{request.matchOffers.map((offer) => <span className="chip border-black/10 bg-black/[0.03] text-slate-600" key={offer.id}>{offer.partner.displayName} · {offer.status} · {offer.fitScore}</span>)}</div> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Introduced partners */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Introduced partners" />
            {request.matches.length ? (
              <div className="space-y-3">
                {request.matches.map((m) => (
                  <div key={m.id} className="rounded-xl border border-leaf-400/20 bg-leaf-400/[0.04] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-sm font-semibold text-slate-900">{m.partner.displayName}</p>
                      <StatusBadge status={m.status} />
                      {m.introductions[0] ? <StatusBadge status={m.introductions[0].status} /> : null}
                      <Link
                        href={`/company/matches/${m.id}`}
                        className="ml-auto text-xs font-medium text-gold-600 hover:underline"
                      >
                        Open deal room →
                      </Link>
                    </div>
                    <div className="mt-2">
                      <TrackRecordBadge
                        record={
                          trackRecords.get(m.partnerId) ?? {
                            totalIntroductions: 0,
                            successfulIntroductions: 0,
                            failedIntroductions: 0,
                            successRate: null,
                            avgResponseHours: null,
                          }
                        }
                      />
                    </div>
                    {m.aiExplanation ? (
                      <p className="mt-2 rounded-lg border border-gold-500/20 bg-gold-500/[0.05] px-3 py-2 text-xs leading-relaxed text-slate-600">
                        ✨ {m.aiExplanation}
                      </p>
                    ) : null}
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
              <KV label="Request type">{requestTypeLabel(request.requestType)}</KV>
              <KV label="Daily volume">{request.dailyVolumeBand}</KV>
              <KV label="Monthly volume">{request.monthlyVolumeBand}</KV>
              <KV label="Ticket size">{request.ticketSize ?? "Not provided"}</KV>
              <KV label="Required speed">{request.requiredSpeed}</KV>
              <KV label="Jurisdiction">{request.jurisdiction}</KV>
              <KV label="Countries involved">{request.countriesInvolved ?? "Not provided"}</KV>
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
              INRP2P never holds or moves the transaction funds. We review, match and introduce.
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
