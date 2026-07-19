import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addPartnerDocument, addPartnerNote, generateReferralCode } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, FormError, KV, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import {
  DocumentComposer,
  DocumentList,
  NoteComposer,
  NoteList,
} from "@/components/workspace/records";
import { ReferralCard, type ReferredAccountRow } from "@/components/workspace/referral-card";
import { TelegramConnectCard } from "@/components/workspace/telegram-connect";
import { TrackRecordCard } from "@/components/workspace/track-record";
import { requireRole } from "@/lib/auth";
import { deriveMatchStage, dealStageHint } from "@/lib/deal-stage";
import { db } from "@/lib/db";
import { directionLabel, fmtDate } from "@/lib/format";
import { listReferredPartners, referralUrl } from "@/lib/referral";
import { getPartnerTrackRecord } from "@/lib/reputation";
import { TELEGRAM_BOT_USERNAME } from "@/lib/site";

export const metadata: Metadata = { title: "Partner overview" };

const STATUS_EXPLAINER: Record<string, string> = {
  APPLIED:
    "Your application is in the review queue. Operations reviews every application manually — expect first contact within 24–48 hours.",
  UNDER_REVIEW:
    "Verification in progress. Have KYB documents ready and watch for a message from operations — a short call is usually part of this stage.",
  VERIFIED:
    "You are a verified partner. You are eligible for matching, and released requests appear below as they arrive.",
  LIMITED:
    "You are verified with limitations. You may receive matches with caveats — operations will note the specifics in shared notes below.",
  REJECTED:
    "Your application was not accepted. See shared notes for the reason; you may reapply once the gaps are addressed.",
  SUSPENDED:
    "Your participation is suspended and you are excluded from new matches. Contact operations via a note below.",
};

export default async function PartnerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PARTNER");
  if (!user.partner) redirect("/login");
  const { error } = await searchParams;

  const partner = await db.partnerProfile.findUnique({
    where: { id: user.partner.id },
    include: {
      matches: {
        where: { releasedToPartner: true },
        include: {
          request: true,
          introductions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { _count: { select: { messages: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      notesList: { where: { visibility: "PARTNER" }, orderBy: { createdAt: "desc" } },
      documents: { where: { visibility: "PARTNER" }, orderBy: { createdAt: "desc" } },
      deposits: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!partner) redirect("/login");

  const trackRecord = await getPartnerTrackRecord(partner.id);
  const confirmedReserve = partner.deposits
    .filter((deposit) => deposit.status === "CONFIRMED")
    .reduce((sum, deposit) => sum + Number((deposit.actualAmount ?? deposit.amount).toString()), 0);
  const pendingDeposits = partner.deposits.filter((deposit) => ["AWAITING_PAYMENT", "CONFIRMING"].includes(deposit.status)).length;

  const referredRows: ReferredAccountRow[] = partner.referralCode
    ? (await listReferredPartners(partner.referralCode)).map((p) => ({
        id: p.id,
        label: p.displayName,
        createdAt: p.createdAt.toISOString(),
        dealClosed: p.matches.some((m) => m.introductions.some((i) => i.status === "SUCCESSFUL")),
      }))
    : [];

  return (
    <>
      <PageHeader
        title={partner.displayName}
        sub={`Partner ${partner.reference} · applied ${fmtDate(partner.createdAt)}`}
        actions={
          <Link href="/partner/profile" className="btn btn-ghost btn-sm">
            Update capacity
          </Link>
        }
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      {/* Verification status */}
      <div
        className={
          partner.status === "VERIFIED"
            ? "card mb-5 border-leaf-400/30 p-5"
            : partner.status === "REJECTED" || partner.status === "SUSPENDED"
              ? "card mb-5 border-rose-400/30 p-5"
              : "card mb-5 border-amber-400/25 p-5"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={partner.status} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Verification status
          </p>
          {partner.verifiedAt ? (
            <span className="text-xs text-slate-500">verified {fmtDate(partner.verifiedAt)}</span>
          ) : null}
        </div>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          {STATUS_EXPLAINER[partner.status]}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Matched requests */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Matched requests" />
            {partner.matches.length ? (
              <div className="space-y-3">
                {partner.matches.map((m) => {
                  const stage = deriveMatchStage({
                    matchStatus: m.status,
                    releasedToCompany: true,
                    releasedToPartner: true,
                    introStatus: m.introductions[0]?.status ?? null,
                    hasMessages: (m.introductions[0]?._count.messages ?? 0) > 0,
                  });
                  return (
                  <div key={m.id} className="rounded-xl border border-gold-500/20 bg-gold-500/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-mono text-xs text-gold-700">{m.request.reference}</span>
                      <p className="text-sm font-semibold text-slate-900">
                        {directionLabel(m.request.direction)}
                      </p>
                      <StatusBadge status={m.status} />
                      {m.introductions[0] ? <StatusBadge status={m.introductions[0].status} /> : null}
                      <span className="chip border-gold-500/30 bg-gold-500/10 text-gold-700">
                        {dealStageHint(stage, "partner").title}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-400">{fmtDate(m.createdAt)}</span>
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/partner/matches/${m.id}`}
                        className="text-xs font-medium text-gold-600 hover:underline"
                      >
                        Open deal room →
                      </Link>
                    </div>
                    <dl className="kv mt-3 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                      <KV label="Daily volume">{m.request.dailyVolumeBand}</KV>
                      <KV label="Monthly volume">{m.request.monthlyVolumeBand}</KV>
                      <KV label="Required speed">{m.request.requiredSpeed}</KV>
                      <KV label="Jurisdiction">{m.request.jurisdiction}</KV>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[...m.request.banks, ...m.request.methods].map((x) => (
                        <span key={x} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                          {x}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                      The company&apos;s identity is shared by operations at introduction.
                      All terms and settlement are agreed directly between you and the company.
                    </p>
                  </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No matched requests yet"
                body={
                  partner.status === "VERIFIED" || partner.status === "LIMITED"
                    ? "You are eligible for matching. Requests that fit your declared coverage will appear here when released."
                    : "Matching begins after verification. Keep your capacity and coverage accurate meanwhile."
                }
              />
            )}
          </div>

          {/* Notes */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Notes & updates" />
            <div className="mb-4">
              <NoteComposer
                action={addPartnerNote}
                hidden={{}}
                placeholder="Message network operations — availability changes, questions…"
              />
            </div>
            <NoteList notes={partner.notesList} />
          </div>

          {/* Documents */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Documents" />
            <div className="mb-4">
              <DocumentComposer action={addPartnerDocument} hidden={{}} />
            </div>
            <DocumentList documents={partner.documents} />
          </div>
        </div>

        {/* Rail */}
        <div className="space-y-5">
          <TelegramConnectCard
            telegramChatId={user.telegramChatId}
            telegramLinkCode={user.telegramLinkCode}
            botUsername={TELEGRAM_BOT_USERNAME || undefined}
          />
          {partner.referralCode ? (
            <ReferralCard
              url={referralUrl("apply", partner.referralCode)}
              code={partner.referralCode}
              referred={referredRows}
            />
          ) : (
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Refer someone
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
                Get your own shareable link — anyone who signs up through it is on record as
                your referral from day one.
              </p>
              <form action={generateReferralCode} className="mt-3">
                <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Generating…">
                  Get my link
                </SubmitButton>
              </form>
            </div>
          )}
          <div className="card p-5">
            <TrackRecordCard record={trackRecord} title="Your track record" />
          </div>
          <div className="card p-5">
            <SectionTitle title="USDT operating reserve" action={<StatusBadge status={pendingDeposits ? "CONFIRMING" : confirmedReserve > 0 ? "CONFIRMED" : "AWAITING_PAYMENT"} />} />
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{confirmedReserve.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span className="text-sm text-slate-400">USDT</span></p>
            <p className="mt-1 text-xs text-slate-500">{pendingDeposits ? `${pendingDeposits} deposit${pendingDeposits === 1 ? "" : "s"} confirming` : "No transfer currently confirming"}</p>
            <Link href="/partner/deposit" className="btn btn-gold btn-sm mt-4 w-full">Open USDT reserve</Link>
          </div>
          <div className="card p-5">
            <SectionTitle title="Declared coverage" />
            <dl className="space-y-3">
              <KV label="Directions">
                {partner.directions.map((d) => directionLabel(d)).join(", ")}
              </KV>
              <KV label="Daily capacity">{partner.dailyCapacityBand}</KV>
              <KV label="Declared reserve capacity">{partner.reserveBand}</KV>
              <KV label="Working hours">{partner.workingHours}</KV>
              <KV label="Coverage">{partner.jurisdictions}</KV>
              <KV label="Banks">{partner.banks.join(", ")}</KV>
              <KV label="Methods">{partner.methods.join(", ")}</KV>
            </dl>
            <Link href="/partner/profile" className="btn btn-ghost btn-sm mt-4 w-full">
              Update capacity & coverage
            </Link>
          </div>
          <div className="card p-5">
            <SectionTitle title="How matching works" />
            <p className="text-[13px] leading-relaxed text-slate-500">
              Operations matches on your declared directions, banks, capacity and
              hours. Keeping these accurate is what gets you introductions — and
              what keeps them successful. Every profile change is recorded and may
              trigger a re-review.
            </p>
          </div>
          <div className="card p-5">
            <SectionTitle title="Clear rules" />
            <p className="text-[12.5px] leading-relaxed text-slate-500">
              You only see company requests that operations has explicitly released to
              you — there is no public order book. Verification is not a guarantee of
              volume, and INRP2P does not endorse or guarantee any company or partner.
              Full detail:{" "}
              <Link href="/partner-review" className="text-gold-600 hover:underline">
                Partner review
              </Link>{" "}
              ·{" "}
              <Link href="/disclaimer" className="text-gold-600 hover:underline">
                Disclaimer
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
