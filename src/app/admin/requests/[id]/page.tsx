import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDocument,
  addNote,
  addRevenue,
  approveAndIntroduce,
  createIntroduction,
  createMatch,
  createRevenueCryptoInvoice,
  createRevenuePaymentLink,
  toggleMatchRelease,
  updateCompanyRetainer,
  updateIntroductionOutcome,
  updateIntroductionStatus,
  updateMatchDecision,
  updateMatchStatus,
  updateRequestStatus,
  updateRevenueStatus,
} from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import {
  BackLink,
  EmptyState,
  FormError,
  KV,
  SectionTitle,
  StatusBadge,
} from "@/components/ui";
import { AiBriefingCard } from "@/components/workspace/ai-briefing";
import { AiMatchExplanation } from "@/components/workspace/ai-match-explanation";
import { Disclosure } from "@/components/workspace/disclosure";
import { PipelineStepper } from "@/components/workspace/pipeline-stepper";
import {
  DocumentComposer,
  DocumentList,
  NoteComposer,
  NoteList,
} from "@/components/workspace/records";
import { StatusPills } from "@/components/workspace/status-pills";
import { Timeline } from "@/components/workspace/timeline";
import { db } from "@/lib/db";
import {
  auditLabel,
  directionLabel,
  fmtDate,
  fmtDateTime,
  money,
  requestTypeLabel,
  revenueTypeLabel,
  statusLabel,
} from "@/lib/format";
import { draftIntroductionSummary, rankPartners } from "@/lib/matching";
import { isNowPaymentsConfigured } from "@/lib/nowpayments";
import { isRazorpayConfigured } from "@/lib/razorpay";
import {
  CURRENCIES,
  INTRO_CHANNELS,
  INTRODUCTION_STATUSES,
  MATCH_STATUSES,
  REVENUE_STATUSES,
  REVENUE_TYPE_OPTIONS,
} from "@/lib/options";

export const metadata: Metadata = { title: "Request detail" };

const ADMIN_NOTE_VISIBILITY = [
  { value: "INTERNAL", label: "Internal only" },
  { value: "COMPANY", label: "Share with company" },
];

const REQUEST_FLOW = ["SUBMITTED", "IN_REVIEW", "MATCHING", "INTRODUCED", "CLOSED"] as const;

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const request = await db.liquidityRequest.findUnique({
    where: { id },
    include: {
      company: { include: { user: { select: { email: true } } } },
      matches: {
        include: {
          partner: true,
          introductions: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      notesList: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      revenues: {
        include: { match: { include: { partner: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!request) notFound();

  const [eligiblePartners, timeline] = await Promise.all([
    db.partnerProfile.findMany({
      where: {
        status: { in: ["VERIFIED", "LIMITED"] },
        directions: { has: request.direction },
        id: { notIn: request.matches.map((m) => m.partnerId) },
      },
      orderBy: { displayName: "asc" },
    }),
    db.auditLog.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const back = `/admin/requests/${id}`;
  const suggestions = rankPartners(request, eligiblePartners, 5);
  const hasAnyMatch = request.matches.length > 0;

  return (
    <>
      <BackLink href="/admin/requests" label="All requests" />

      <div className="mb-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-gold-700">{request.reference}</span>
        <h1 className="text-xl font-semibold text-slate-900">{request.company.companyName}</h1>
        <span className="text-xs text-slate-500">
          {directionLabel(request.direction)} · submitted {fmtDate(request.createdAt)}
        </span>
      </div>

      {/* Pipeline — the single, unmissable "where is this deal" control */}
      <div className="card mb-6 p-4 sm:p-5">
        <PipelineStepper
          action={updateRequestStatus}
          hidden={{ requestId: request.id, back }}
          steps={REQUEST_FLOW}
          current={request.status}
          branches={["REJECTED"]}
        />
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-5">
          {/* Requirement */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Requirement" />
            <dl className="kv grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
              <KV label="Request type">{requestTypeLabel(request.requestType)}</KV>
              <KV label="Direction (matching)">{directionLabel(request.direction)}</KV>
              <KV label="Daily volume">{request.dailyVolumeBand}</KV>
              <KV label="Monthly volume">{request.monthlyVolumeBand}</KV>
              <KV label="Ticket size">{request.ticketSize ?? "Not provided"}</KV>
              <KV label="Urgency">
                <StatusBadge status={request.urgency} />
              </KV>
              <KV label="Required speed">{request.requiredSpeed}</KV>
              <KV label="Operating jurisdiction">{request.jurisdiction}</KV>
              <KV label="Countries involved">{request.countriesInvolved ?? "Not provided"}</KV>
              <KV label="KYC / KYB readiness">{request.kycReadiness}</KV>
            </dl>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Banks</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {request.banks.map((b) => (
                    <span key={b} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Methods</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {request.methods.map((m) => (
                    <span key={m} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              {request.kycNotes ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Compliance / licensing notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{request.kycNotes}</p>
                </div>
              ) : null}
              {request.partnerRequirements ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Preferred partner requirements
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {request.partnerRequirements}
                  </p>
                </div>
              ) : null}
              {request.notes ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Company notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{request.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Matching */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title={`Matching · ${request.matches.length}`} />

            <div className="space-y-4">
              {request.matches.map((m) => {
                const hasDecisionData = m.confidenceScore != null || !!m.nextAction;
                return (
                  <div key={m.id} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Link
                        href={`/admin/partners/${m.partnerId}`}
                        className="text-sm font-semibold text-slate-900 hover:text-gold-700"
                      >
                        {m.partner.displayName}
                      </Link>
                      <span className="font-mono text-[11px] text-leaf-700">{m.partner.reference}</span>
                      <span className="text-[11px] text-slate-400">
                        {m.partner.dailyCapacityBand} · {m.partner.workingHours}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-400">{fmtDate(m.createdAt)}</span>
                    </div>
                    {m.adminNote ? (
                      <p className="mt-2 rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-slate-600">
                        {m.adminNote}
                      </p>
                    ) : null}
                    <AiMatchExplanation matchId={m.id} initialExplanation={m.aiExplanation} />

                    {/* Stage + release, the two things that matter at a glance */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <StatusPills
                        action={updateMatchStatus}
                        hidden={{ matchId: m.id, back }}
                        options={MATCH_STATUSES}
                        current={m.status}
                        tone="danger"
                        labels={{ INTRODUCED: "Introduced" }}
                      />
                      <div className="flex items-center gap-1.5 border-l border-black/10 pl-3">
                        <form action={toggleMatchRelease} className="contents">
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="side" value="company" />
                          <input type="hidden" name="back" value={back} />
                          <button
                            type="submit"
                            className={`pill ${m.releasedToCompany ? "pill-active" : ""}`}
                          >
                            {m.releasedToCompany ? "✓ Released to company" : "Release to company"}
                          </button>
                        </form>
                        <form action={toggleMatchRelease} className="contents">
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="side" value="partner" />
                          <input type="hidden" name="back" value={back} />
                          <button
                            type="submit"
                            className={`pill ${m.releasedToPartner ? "pill-active" : ""}`}
                          >
                            {m.releasedToPartner ? "✓ Released to partner" : "Release to partner"}
                          </button>
                        </form>
                      </div>
                      {!m.releasedToCompany || !m.releasedToPartner || m.introductions.length === 0 ? (
                        <form action={approveAndIntroduce} className="contents">
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="back" value={back} />
                          <SubmitButton className="btn btn-gold btn-sm ml-auto" pendingLabel="Approving…">
                            ⚡ Approve &amp; introduce
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>

                    {/* Decision notes — tucked away unless already in use */}
                    <Disclosure
                      label="Decision notes"
                      defaultOpen={hasDecisionData}
                      className="mt-3 border-t border-black/5 pt-3"
                    >
                      <form
                        action={updateMatchDecision}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="matchId" value={m.id} />
                        <input type="hidden" name="back" value={back} />
                        <input
                          name="confidenceScore"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={m.confidenceScore ?? ""}
                          className="input h-8 w-24 py-0 text-xs"
                          placeholder="Confidence 0–100"
                        />
                        <input
                          name="nextAction"
                          defaultValue={m.nextAction ?? ""}
                          className="input h-8 min-w-40 flex-1 py-0 text-xs"
                          placeholder="Next action — decision support only"
                        />
                        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                          Save
                        </SubmitButton>
                      </form>
                    </Disclosure>

                    {/* Introductions */}
                    <div className="mt-4 border-t border-black/5 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Introduction
                      </p>
                      {m.introductions.length ? (
                        <ul className="space-y-2">
                          {m.introductions.map((intro) => {
                            const hasFollowUpData =
                              !!intro.followUpDate || !!intro.outcome || intro.settledRate != null;
                            return (
                              <li
                                key={intro.id}
                                className="rounded-lg bg-black/[0.03] px-3 py-2.5"
                              >
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                  <span className="text-xs font-medium text-slate-600">
                                    via {intro.channel.toLowerCase()}
                                    {intro.sentAt ? ` · sent ${fmtDateTime(intro.sentAt)}` : ""}
                                  </span>
                                </div>
                                {intro.summary ? (
                                  <p className="mt-1 text-xs text-slate-500">{intro.summary}</p>
                                ) : null}
                                <div className="mt-2">
                                  <StatusPills
                                    action={updateIntroductionStatus}
                                    hidden={{ introductionId: intro.id, back }}
                                    options={INTRODUCTION_STATUSES}
                                    current={intro.status}
                                    tone="danger"
                                  />
                                </div>

                                <Disclosure
                                  label="Follow-up & outcome"
                                  defaultOpen={hasFollowUpData}
                                  className="mt-2.5 border-t border-black/5 pt-2.5"
                                >
                                  <form
                                    action={updateIntroductionOutcome}
                                    className="flex flex-wrap items-center gap-2"
                                  >
                                    <input type="hidden" name="introductionId" value={intro.id} />
                                    <input type="hidden" name="back" value={back} />
                                    <input
                                      type="date"
                                      name="followUpDate"
                                      defaultValue={
                                        intro.followUpDate
                                          ? intro.followUpDate.toISOString().slice(0, 10)
                                          : ""
                                      }
                                      className="input h-8 w-auto py-0 text-xs"
                                    />
                                    <input
                                      name="outcome"
                                      defaultValue={intro.outcome ?? ""}
                                      className="input h-8 min-w-40 flex-1 py-0 text-xs"
                                      placeholder="Outcome notes"
                                    />
                                    {request.direction === "INR_TO_USDT" ||
                                    request.direction === "USDT_TO_INR" ? (
                                      <input
                                        name="settledRate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        defaultValue={intro.settledRate?.toString() ?? ""}
                                        className="input h-8 w-32 py-0 text-xs"
                                        placeholder="₹/USDT settled"
                                      />
                                    ) : null}
                                    <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                                      Save
                                    </SubmitButton>
                                  </form>
                                </Disclosure>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}

                      <Disclosure
                        label={m.introductions.length ? "+ Record another introduction" : "Record introduction"}
                        defaultOpen={m.introductions.length === 0}
                        className={m.introductions.length ? "mt-3" : "mt-1"}
                      >
                        <form action={createIntroduction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="back" value={back} />
                          <select name="channel" defaultValue="EMAIL" className="input h-8 w-auto py-0 text-xs">
                            {INTRO_CHANNELS.map((c) => (
                              <option key={c} value={c}>
                                {statusLabel(c)}
                              </option>
                            ))}
                          </select>
                          <input
                            name="summary"
                            defaultValue={draftIntroductionSummary(request, m.partner)}
                            className="input h-8 min-w-40 flex-1 py-0 text-xs"
                            placeholder="Summary — who was introduced to whom, context"
                          />
                          <SubmitButton className="btn btn-gold btn-sm" pendingLabel="…">
                            Record introduction
                          </SubmitButton>
                        </form>
                      </Disclosure>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add a partner match — collapsed once one already exists */}
            <Disclosure
              label={hasAnyMatch ? "+ Add another partner match" : "Add a partner match"}
              defaultOpen={!hasAnyMatch}
              className="mt-5 border-t border-black/10 pt-5"
            >
              <div className="space-y-4">
                {suggestions.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Suggested · scored automatically
                    </p>
                    {suggestions.map(({ partner: p, score, reasons }) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 animate-reveal"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span
                            className={`chip font-mono font-semibold ${
                              score >= 70
                                ? "border-leaf-300 bg-leaf-50 text-leaf-700"
                                : score >= 40
                                  ? "border-gold-300 bg-gold-50 text-gold-700"
                                  : "border-black/10 bg-black/[0.03] text-slate-500"
                            }`}
                          >
                            {score}/100
                          </span>
                          <Link
                            href={`/admin/partners/${p.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-gold-700"
                          >
                            {p.displayName}
                          </Link>
                          <span className="font-mono text-[11px] text-leaf-700">{p.reference}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">{reasons.join(" · ")}</p>
                        <form action={createMatch} className="mt-2.5 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="back" value={back} />
                          <input type="hidden" name="partnerId" value={p.id} />
                          <input type="hidden" name="confidenceScore" value={score} />
                          <input
                            name="adminNote"
                            className="input h-8 min-w-40 flex-1 py-0 text-xs"
                            placeholder="Why this partner fits — optional"
                          />
                          <SubmitButton className="btn btn-gold btn-sm" pendingLabel="…">
                            Match at {score}/100
                          </SubmitButton>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Manual selection
                  </p>
                  {eligiblePartners.length ? (
                    <form action={createMatch} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="back" value={back} />
                      <select name="partnerId" defaultValue="" className="input h-9 w-auto max-w-full py-0 text-xs">
                        <option value="" disabled>
                          Select a reviewed partner…
                        </option>
                        {eligiblePartners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.reference})
                          </option>
                        ))}
                      </select>
                      <input
                        name="adminNote"
                        className="input h-9 min-w-40 flex-1 py-0 text-xs"
                        placeholder="Why this partner fits — optional"
                      />
                      <SubmitButton className="btn btn-gold btn-sm" pendingLabel="…">
                        Create match
                      </SubmitButton>
                    </form>
                  ) : (
                    <EmptyState
                      title="No eligible partners for this direction"
                      body="Partners must be Verified or Limited and support this corridor. Review partner applications first."
                    />
                  )}
                </div>
              </div>
            </Disclosure>
          </div>

          {/* Revenue */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title={`Revenue · ${request.revenues.length}`} />
            {request.revenues.length ? (
              <ul className="mb-4 space-y-2">
                {request.revenues.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-black/10 bg-black/[0.02] px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {money(r.amount.toString(), r.currency)}
                      </span>
                      <span className="chip border-black/10 bg-black/[0.03] text-slate-600">
                        {revenueTypeLabel(r.type)}
                      </span>
                      {r.payerName ? (
                        <span className="text-xs text-slate-500">
                          {r.payerType ? `${r.payerType} — ` : ""}
                          {r.payerName}
                        </span>
                      ) : null}
                      {r.match ? (
                        <span className="text-xs text-slate-400">via {r.match.partner.displayName}</span>
                      ) : null}
                      <span className="ml-auto text-[11px] text-slate-400">
                        {[
                          r.dueDate ? `due ${fmtDate(r.dueDate)}` : null,
                          r.paidAt ? `paid ${fmtDate(r.paidAt)}` : null,
                          `created ${fmtDate(r.createdAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    {r.basis ? <p className="mt-1 text-xs text-slate-500">{r.basis}</p> : null}

                    <div className="mt-2.5">
                      <StatusPills
                        action={updateRevenueStatus}
                        hidden={{ revenueId: r.id, back }}
                        options={REVENUE_STATUSES}
                        current={r.status}
                      />
                    </div>

                    {r.paymentLinkUrl ? (
                      <div className="mt-2.5 flex items-center gap-2 rounded-md border border-gold-600/20 bg-gold-500/[0.06] px-2.5 py-1.5 text-xs">
                        <span className="font-medium text-slate-700">Razorpay link:</span>
                        <a
                          href={r.paymentLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-gold-700 underline decoration-gold-600/40 underline-offset-2 hover:text-gold-800"
                        >
                          {r.paymentLinkUrl}
                        </a>
                        {r.paymentRef ? (
                          <span className="text-[11px] text-slate-400">· paid ({r.paymentRef})</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">· share this with the payer</span>
                        )}
                      </div>
                    ) : isRazorpayConfigured() &&
                      r.currency === "INR" &&
                      !["PAID", "CANCELLED", "LOST", "WAIVED"].includes(r.status) ? (
                      <form action={createRevenuePaymentLink} className="mt-2.5">
                        <input type="hidden" name="revenueId" value={r.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Generating…">
                          Generate Razorpay payment link
                        </SubmitButton>
                      </form>
                    ) : null}

                    {r.cryptoInvoiceUrl ? (
                      <div className="mt-2.5 flex items-center gap-2 rounded-md border border-emerald-600/20 bg-emerald-500/[0.06] px-2.5 py-1.5 text-xs">
                        <span className="font-medium text-slate-700">USDT invoice:</span>
                        <a
                          href={r.cryptoInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800"
                        >
                          {r.cryptoInvoiceUrl}
                        </a>
                        {r.cryptoPaymentRef ? (
                          <span className="text-[11px] text-slate-400">· paid ({r.cryptoPaymentRef})</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">· share this with the payer</span>
                        )}
                      </div>
                    ) : isNowPaymentsConfigured() &&
                      r.currency === "USDT" &&
                      !["PAID", "CANCELLED", "LOST", "WAIVED"].includes(r.status) ? (
                      <form action={createRevenueCryptoInvoice} className="mt-2.5">
                        <input type="hidden" name="revenueId" value={r.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Generating…">
                          Generate USDT invoice
                        </SubmitButton>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-4">
                <EmptyState
                  title="No revenue recorded"
                  body="Record the potential introduction fee as soon as a match looks serious."
                />
              </div>
            )}

            <Disclosure
              label={request.revenues.length ? "+ Record revenue" : "Record revenue"}
              defaultOpen={request.revenues.length === 0}
              className="border-t border-black/10 pt-4"
            >
              <form action={addRevenue} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="back" value={back} />
                <input
                  name="amount"
                  type="number"
                  step="any"
                  min="0"
                  className="input h-9 w-32 py-0 text-xs"
                  placeholder="Amount"
                />
                <select name="currency" defaultValue="INR" className="input h-9 w-auto py-0 text-xs">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select name="type" defaultValue="INTRO_FEE" className="input h-9 w-auto py-0 text-xs">
                  {REVENUE_TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {request.matches.length ? (
                  <select name="matchId" defaultValue="" className="input h-9 w-auto py-0 text-xs">
                    <option value="">No specific match</option>
                    {request.matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        via {m.partner.displayName}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input name="payerType" className="input h-9 w-28 py-0 text-xs" placeholder="Payer type" />
                <input name="payerName" className="input h-9 w-36 py-0 text-xs" placeholder="Payer name" />
                <input name="dueDate" type="date" className="input h-9 w-auto py-0 text-xs" />
                <input
                  name="basis"
                  className="input h-9 min-w-40 flex-1 py-0 text-xs"
                  placeholder="Basis — e.g. 25 bps on first-month volume"
                />
                <SubmitButton className="btn btn-gold btn-sm" pendingLabel="…">
                  Record
                </SubmitButton>
              </form>
            </Disclosure>
          </div>

          {/* Notes */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Notes" />
            <div className="mb-4">
              <NoteComposer
                action={addNote}
                hidden={{ requestId: request.id, back }}
                visibilityOptions={ADMIN_NOTE_VISIBILITY}
              />
            </div>
            <NoteList notes={request.notesList} showVisibility />
          </div>

          {/* Documents */}
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Documents" />
            <div className="mb-4">
              <DocumentComposer
                action={addDocument}
                hidden={{ requestId: request.id, back }}
                visibilityOptions={ADMIN_NOTE_VISIBILITY}
              />
            </div>
            <DocumentList documents={request.documents} showVisibility />
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-5 xl:sticky xl:top-7 xl:self-start">
          <AiBriefingCard requestId={request.id} />

          <div className="card p-5">
            <SectionTitle title="Company" />
            <dl className="space-y-3">
              <KV label="Company">{request.company.companyName}</KV>
              <KV label="Registered in">{request.company.jurisdiction}</KV>
              {request.company.website ? (
                <KV label="Website">
                  <a
                    href={request.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-gold-600 hover:underline"
                  >
                    {request.company.website}
                  </a>
                </KV>
              ) : null}
              <KV label="Contact">
                {request.company.contactName}
                {request.company.contactRole ? ` — ${request.company.contactRole}` : ""}
              </KV>
              <KV label="Email">
                <a href={`mailto:${request.company.user.email}`} className="text-gold-600 hover:underline">
                  {request.company.user.email}
                </a>
              </KV>
              {request.company.telegram ? <KV label="Telegram">{request.company.telegram}</KV> : null}
              {request.company.phone ? <KV label="Phone">{request.company.phone}</KV> : null}
            </dl>
          </div>

          <div className="card p-5">
            <SectionTitle title="Monthly retainer" />
            {request.company.retainerActive && request.company.retainerAmount ? (
              <p className="mb-3 text-[13px] leading-relaxed text-slate-600">
                Active — {money(request.company.retainerAmount.toString(), request.company.retainerCurrency ?? "INR")}/mo
                {request.company.retainerNextRenewal
                  ? `, next ${fmtDate(request.company.retainerNextRenewal)}`
                  : ""}
                .
              </p>
            ) : (
              <p className="mb-3 text-[13px] leading-relaxed text-slate-500">
                Not on a retainer — recurring fee billed independently of any single request.
              </p>
            )}
            <Disclosure label={request.company.retainerActive ? "Edit retainer" : "Set up a retainer"}>
              <form action={updateCompanyRetainer} className="space-y-3">
                <input type="hidden" name="companyId" value={request.company.id} />
                <input type="hidden" name="back" value={back} />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="retainerActive"
                    defaultChecked={request.company.retainerActive}
                    className="h-4 w-4 rounded border-black/20"
                  />
                  Retainer active
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="retainerAmount"
                    min="0"
                    step="0.01"
                    defaultValue={request.company.retainerAmount?.toString() ?? ""}
                    placeholder="Amount"
                    className="input h-9 text-xs"
                  />
                  <select
                    name="retainerCurrency"
                    defaultValue={request.company.retainerCurrency ?? "INR"}
                    className="input h-9 text-xs"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  name="retainerDayOfMonth"
                  min="1"
                  max="28"
                  defaultValue={request.company.retainerDayOfMonth ?? 1}
                  placeholder="Billing day (1–28)"
                  className="input h-9 text-xs"
                />
                <SubmitButton className="btn btn-ghost btn-sm w-full" pendingLabel="Saving…">
                  Save retainer
                </SubmitButton>
              </form>
            </Disclosure>
          </div>

          <div className="card p-5">
            <SectionTitle title="Timeline" />
            <Timeline
              items={timeline.map((a) => ({
                id: a.id,
                when: a.createdAt,
                label: auditLabel(a.action, a.meta),
                actor: a.actorLabel,
              }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
