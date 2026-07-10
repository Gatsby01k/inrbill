import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink, FormError, KV, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { DealProgress, NextStepHint } from "@/components/workspace/deal-progress";
import { DealRoom } from "@/components/workspace/deal-room";
import { TrackRecordBadge } from "@/components/workspace/track-record";
import { isAiConfigured } from "@/lib/ai";
import { requireRole } from "@/lib/auth";
import { deriveMatchStage } from "@/lib/deal-stage";
import { db } from "@/lib/db";
import { directionLabel, fmtDate } from "@/lib/format";
import { getPartnerTrackRecord } from "@/lib/reputation";

export const metadata: Metadata = { title: "Deal room" };

export default async function CompanyMatchPage({
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

  const match = await db.match.findUnique({
    where: { id },
    include: {
      request: true,
      partner: true,
      introductions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!match || match.request.companyId !== user.company.id || !match.releasedToCompany) {
    notFound();
  }

  const intro = match.introductions[0] ?? null;
  const [messages, trackRecord] = await Promise.all([
    intro
      ? db.introductionMessage.findMany({
          where: { introductionId: intro.id },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    getPartnerTrackRecord(match.partnerId),
  ]);

  const stage = deriveMatchStage({
    matchStatus: match.status,
    releasedToCompany: match.releasedToCompany,
    releasedToPartner: match.releasedToPartner,
    introStatus: intro?.status ?? null,
    hasMessages: messages.length > 0,
  });

  return (
    <>
      <BackLink href="/company" label="My requests" />

      <PageHeader
        title={match.partner.displayName}
        sub={`${match.request.reference} · ${directionLabel(match.request.direction)}`}
        actions={<StatusBadge status={match.status} />}
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="card mb-5 space-y-4 p-5">
        <DealProgress stage={stage} />
        <NextStepHint stage={stage} role="company" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Deal room" />
            {intro ? (
              <DealRoom
                matchId={match.id}
                introductionId={intro.id}
                messages={messages}
                viewerSide="COMPANY"
                aiEnabled={isAiConfigured()}
              />
            ) : (
              <p className="text-[13px] text-slate-500">
                Operations is preparing your introduction — this thread opens once it&apos;s sent.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5 xl:sticky xl:top-7 xl:self-start">
          <div className="card p-5">
            <SectionTitle title="Partner" />
            <div className="mb-3">
              <TrackRecordBadge record={trackRecord} />
            </div>
            {match.aiExplanation ? (
              <p className="mb-3 rounded-lg border border-gold-500/20 bg-gold-500/[0.05] px-3 py-2 text-xs leading-relaxed text-slate-600">
                ✨ {match.aiExplanation}
              </p>
            ) : null}
            <dl className="space-y-3">
              <KV label="Partner">{match.partner.displayName}</KV>
              <KV label="Capacity">{match.partner.dailyCapacityBand}</KV>
              <KV label="Working hours">{match.partner.workingHours}</KV>
              <KV label="Coverage">{match.partner.jurisdictions}</KV>
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[...match.partner.banks, ...match.partner.methods].map((x) => (
                <span key={x} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                  {x}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              Matched {fmtDate(match.createdAt)}. All terms and settlement are agreed directly
              between you and the partner — INRP2P coordinates, it does not execute.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
