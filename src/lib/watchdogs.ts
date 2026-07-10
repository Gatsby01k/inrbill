import type { Direction } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { directionLabel, statusLabel } from "@/lib/format";
import { rankPartners, type MatchSuggestion } from "@/lib/matching";
import { sendTelegramAlert } from "@/lib/telegram";

// Three watchdogs, one shared idea: don't rely on an operator noticing.
// The audit log (already the system of record for every state change) also
// doubles as the dedup ledger here — "has this exact alert already fired
// for this entity" — so a watchdog never re-sends the same warning on every
// cron tick, and adding this cost zero new schema.

async function alreadyAlerted(action: string, entityId: string) {
  const existing = await db.auditLog.findFirst({
    where: { action, entityId },
    select: { id: true },
  });
  return existing != null;
}

/* ── 1. SLA-risk watchdog ─────────────────────────────────────────────────
   The site promises a first response within 24–48h. Warn before that
   promise breaks, not after — cutoff is deliberately inside the window. */

const SLA_WARNING_HOURS = 20;

export async function runSlaWatchdog() {
  const cutoff = new Date(Date.now() - SLA_WARNING_HOURS * 60 * 60 * 1000);
  const atRisk = await db.liquidityRequest.findMany({
    where: {
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
      createdAt: { lte: cutoff },
    },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      company: { select: { companyName: true } },
    },
  });

  let sent = 0;
  for (const r of atRisk) {
    const action = "watchdog.sla_risk";
    if (await alreadyAlerted(action, r.id)) continue;

    const hours = Math.round((Date.now() - r.createdAt.getTime()) / 3_600_000);
    const ok = await sendTelegramAlert(
      `⏱ <b>SLA risk</b>\n${r.reference} — ${r.company.companyName}\n` +
        `Still unactioned after ${hours}h. Site promise is 24–48h first response.`,
    );
    if (!ok) continue;

    await audit({
      action,
      entityType: "LiquidityRequest",
      entityId: r.id,
      actorLabel: "Watchdog",
      requestId: r.id,
      meta: { hoursElapsed: hours },
    });
    sent++;
  }
  return { checked: atRisk.length, sent };
}

/* ── 2. Overdue-revenue watchdog ──────────────────────────────────────────
   dueDate has existed on RevenueRecord all along; nothing ever read it for
   this purpose. Flags anything past due that isn't PAID/CANCELLED/LOST/WAIVED. */

export async function runRevenueOverdueWatchdog() {
  const now = new Date();
  const overdue = await db.revenueRecord.findMany({
    where: {
      status: { in: ["POTENTIAL", "QUOTED", "AGREED", "INVOICED"] },
      dueDate: { lt: now },
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      dueDate: true,
      requestId: true,
      request: { select: { reference: true } },
      company: { select: { companyName: true } },
    },
  });

  let sent = 0;
  for (const rev of overdue) {
    const action = "watchdog.revenue_overdue";
    if (await alreadyAlerted(action, rev.id)) continue;

    const label = rev.request?.reference ?? `Retainer — ${rev.company?.companyName ?? "company"}`;
    const days = rev.dueDate ? Math.round((now.getTime() - rev.dueDate.getTime()) / 86_400_000) : 0;
    const ok = await sendTelegramAlert(
      `💸 <b>Revenue overdue</b>\n${label} — ₹${rev.amount.toString()} ${rev.currency}\n` +
        `${days}d past due date, still not marked paid.`,
    );
    if (!ok) continue;

    await audit({
      action,
      entityType: "RevenueRecord",
      entityId: rev.id,
      actorLabel: "Watchdog",
      requestId: rev.requestId,
      meta: { daysOverdue: days },
    });
    sent++;
  }
  return { checked: overdue.length, sent };
}

/* ── 3. Follow-up-due watchdog ─────────────────────────────────────────────
   followUpDate has been readable on the operator dashboard all along ("due
   today" list) but only if someone opens /admin and looks. This pushes the
   same query to Telegram. Dedup key includes the follow-up date itself (not
   just the introduction id) — so if an operator pushes the date forward
   after acting on it, a fresh alert can still fire for the new date instead
   of staying silenced forever by the first alert. */

export async function runFollowUpWatchdog() {
  const now = new Date();
  const due = await db.introduction.findMany({
    where: { followUpDate: { lte: now }, status: { notIn: ["SUCCESSFUL", "FAILED"] } },
    select: {
      id: true,
      followUpDate: true,
      status: true,
      match: {
        select: {
          id: true,
          requestId: true,
          request: { select: { reference: true } },
          partner: { select: { displayName: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const intro of due) {
    if (!intro.followUpDate) continue;
    const dateKey = intro.followUpDate.toISOString().slice(0, 10);
    const action = `watchdog.followup_due:${dateKey}`;
    if (await alreadyAlerted(action, intro.id)) continue;

    const days = Math.round((now.getTime() - intro.followUpDate.getTime()) / 86_400_000);
    const ok = await sendTelegramAlert(
      `📌 <b>Follow-up due</b>\n${intro.match.request.reference} — ${intro.match.partner.displayName}\n` +
        `Still ${statusLabel(intro.status)}. Follow-up was due ${days > 0 ? `${days}d ago` : "today"}.`,
    );
    if (!ok) continue;

    await audit({
      action,
      entityType: "Introduction",
      entityId: intro.id,
      actorLabel: "Watchdog",
      requestId: intro.match.requestId,
      matchId: intro.match.id,
      meta: { followUpDate: dateKey, status: intro.status },
    });
    sent++;
  }
  return { checked: due.length, sent };
}

/* ── 4. Agreed-but-not-invoiced watchdog ──────────────────────────────────
   A fee can sit "AGREED" indefinitely if nobody remembers to invoice it —
   there's no separate agreedAt timestamp, so updatedAt (bumped on every
   status write) is used as a proxy for "when it became AGREED". */

const REVENUE_AGREED_STALE_DAYS = 5;

export async function runRevenueUninvoicedWatchdog() {
  const cutoff = new Date(Date.now() - REVENUE_AGREED_STALE_DAYS * 24 * 60 * 60 * 1000);
  const stale = await db.revenueRecord.findMany({
    where: { status: "AGREED", updatedAt: { lte: cutoff } },
    select: {
      id: true,
      amount: true,
      currency: true,
      updatedAt: true,
      requestId: true,
      request: { select: { reference: true } },
      company: { select: { companyName: true } },
    },
  });

  let sent = 0;
  for (const rev of stale) {
    const action = "watchdog.revenue_uninvoiced";
    if (await alreadyAlerted(action, rev.id)) continue;

    const label = rev.request?.reference ?? `Retainer — ${rev.company?.companyName ?? "company"}`;
    const days = Math.round((Date.now() - rev.updatedAt.getTime()) / 86_400_000);
    const ok = await sendTelegramAlert(
      `🧾 <b>Agreed, not invoiced</b>\n${label} — ₹${rev.amount.toString()} ${rev.currency}\n` +
        `Agreed ${days}d ago, no invoice sent yet.`,
    );
    if (!ok) continue;

    await audit({
      action,
      entityType: "RevenueRecord",
      entityId: rev.id,
      actorLabel: "Watchdog",
      requestId: rev.requestId,
      meta: { daysSinceAgreed: days },
    });
    sent++;
  }
  return { checked: stale.length, sent };
}

/* ── 5. Retainer-renewal watchdog ─────────────────────────────────────────
   Monthly retainer billing lives on CompanyProfile (retainerActive/
   retainerAmount/retainerNextRenewal), independent of any single request —
   this is the recurring-revenue counterpart to Task #57. When a company's
   retainerNextRenewal comes due, this creates a POTENTIAL RevenueRecord tied
   to the company directly (no requestId) and rolls the renewal date forward
   a month, so operations never has to remember to re-invoice manually. */

function advanceRetainerDate(from: Date, dayOfMonth: number): Date {
  // Roll to the same day next month, clamped to that month's real length
  // (e.g. dayOfMonth=31 in a 30-day month lands on the 30th, not Dec 1st).
  const next = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const daysInNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInNextMonth));
  return next;
}

export async function runRetainerRenewalWatchdog() {
  const now = new Date();
  const due = await db.companyProfile.findMany({
    where: {
      retainerActive: true,
      retainerNextRenewal: { lte: now },
      retainerAmount: { not: null },
    },
    select: {
      id: true,
      companyName: true,
      retainerAmount: true,
      retainerCurrency: true,
      retainerDayOfMonth: true,
      retainerNextRenewal: true,
    },
  });

  let sent = 0;
  for (const company of due) {
    if (!company.retainerAmount || !company.retainerNextRenewal) continue;
    const dateKey = company.retainerNextRenewal.toISOString().slice(0, 10);
    const action = `watchdog.retainer_renewal:${dateKey}`;
    if (await alreadyAlerted(action, company.id)) continue;

    const currency = company.retainerCurrency ?? "INR";
    const monthLabel = company.retainerNextRenewal.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const record = await db.revenueRecord.create({
      data: {
        companyId: company.id,
        amount: company.retainerAmount,
        currency,
        type: "MONTHLY_RETAINER",
        payerType: "Company",
        payerName: company.companyName,
        basis: `Monthly retainer — ${monthLabel}`,
        status: "POTENTIAL",
        dueDate: company.retainerNextRenewal,
      },
    });

    const dayOfMonth = company.retainerDayOfMonth ?? company.retainerNextRenewal.getDate();
    const nextRenewal = advanceRetainerDate(company.retainerNextRenewal, dayOfMonth);
    await db.companyProfile.update({
      where: { id: company.id },
      data: { retainerNextRenewal: nextRenewal },
    });

    const ok = await sendTelegramAlert(
      `🔁 <b>Retainer due</b>\n${company.companyName} — ${company.retainerAmount.toString()} ${currency}\n` +
        `${monthLabel} retainer invoice created. Next renewal ${nextRenewal.toISOString().slice(0, 10)}.`,
    );
    void ok; // best-effort notify; the revenue record itself is the source of truth

    await audit({
      action,
      entityType: "RevenueRecord",
      entityId: record.id,
      actorLabel: "Watchdog",
      meta: { companyId: company.id, amount: company.retainerAmount.toString(), currency, nextRenewal: nextRenewal.toISOString() },
    });
    sent++;
  }
  return { checked: due.length, sent };
}

/* ── 6. Coverage-gap watchdog ─────────────────────────────────────────────
   Not cron-driven — fired synchronously the moment a request is created,
   reusing the same scoreMatch() the admin "suggested partners" panel uses.
   If nobody in the network can plausibly fill this, operations should know
   in seconds, not whenever someone happens to open the request. Never
   throws — a failure here must not break the company's submission flow. */

// Exported so the public confirmation pages can use the exact same bar for
// "does this partner plausibly fit" as the internal coverage-gap alert —
// one definition of "good enough," not two that can drift apart.
export const COVERAGE_GAP_SCORE_THRESHOLD = 35;

type CoverageGapRequest = {
  id: string;
  reference: string;
  direction: Direction;
  banks: string[];
  methods: string[];
  dailyVolumeBand: string;
  jurisdiction: string;
  countriesInvolved: string | null;
};

export async function checkCoverageGap(request: CoverageGapRequest) {
  try {
    const eligiblePartners = await db.partnerProfile.findMany({
      where: {
        status: { in: ["VERIFIED", "LIMITED"] },
        directions: { has: request.direction },
      },
    });

    let best: MatchSuggestion | undefined;
    if (eligiblePartners.length > 0) {
      best = rankPartners(request, eligiblePartners, 1)[0];
    }
    const bestScore = best?.score ?? 0;

    if (eligiblePartners.length > 0 && bestScore >= COVERAGE_GAP_SCORE_THRESHOLD) return;

    const action = "watchdog.coverage_gap";
    if (await alreadyAlerted(action, request.id)) return;

    const ok = await sendTelegramAlert(
      `⚠️ <b>Coverage gap</b>\n${request.reference} — ${directionLabel(request.direction)}\n` +
        (eligiblePartners.length === 0
          ? "No verified or limited partner on this corridor at all."
          : `Best available fit only scores ${bestScore}/100.`),
    );
    if (!ok) return;

    await audit({
      action,
      entityType: "LiquidityRequest",
      entityId: request.id,
      actorLabel: "Watchdog",
      requestId: request.id,
      meta: { eligiblePartners: eligiblePartners.length, bestScore },
    });
  } catch (err) {
    console.error("checkCoverageGap failed", err);
  }
}

/* ── 7. Auto-suggest matches ──────────────────────────────────────────────
   Also fired synchronously at submission time, alongside checkCoverageGap —
   the flip side of the same signal. Where checkCoverageGap raises an alert
   when nobody fits, this pre-creates SUGGESTED Match rows for the partners
   who clearly do, so an operator opening the request for the first time
   finds ranked candidates already waiting instead of having to run the
   matching search themselves. It only ever creates SUGGESTED rows — nothing
   is released to either side, and no match here skips manual review before
   a real introduction happens. Never throws, same as checkCoverageGap. */

export const AUTO_MATCH_SCORE_THRESHOLD = 60;
const AUTO_MATCH_MAX = 3;

export async function autoSuggestMatches(request: CoverageGapRequest) {
  try {
    const eligiblePartners = await db.partnerProfile.findMany({
      where: {
        status: { in: ["VERIFIED", "LIMITED"] },
        directions: { has: request.direction },
      },
    });
    if (eligiblePartners.length === 0) return;

    const ranked = rankPartners(request, eligiblePartners, AUTO_MATCH_MAX).filter(
      (r) => r.score >= AUTO_MATCH_SCORE_THRESHOLD,
    );
    if (ranked.length === 0) return;

    for (const { partner, score, reasons } of ranked) {
      try {
        const match = await db.match.create({
          data: {
            requestId: request.id,
            partnerId: partner.id,
            confidenceScore: score,
            adminNote: `Auto-suggested by the matching engine: ${reasons.join("; ")}.`,
          },
        });
        await audit({
          action: "match.auto_suggested",
          entityType: "Match",
          entityId: match.id,
          actorLabel: "Auto-match",
          requestId: request.id,
          partnerId: partner.id,
          matchId: match.id,
          meta: { partnerName: partner.displayName, score },
        });
      } catch (err) {
        // P2002 (unique requestId+partnerId) can't actually happen for a
        // brand-new request, but never let one bad row block the rest.
        console.error("autoSuggestMatches: failed to create one suggestion", err);
      }
    }
  } catch (err) {
    console.error("autoSuggestMatches failed", err);
  }
}

/* ── 8. Stale-suggestion watchdog ─────────────────────────────────────────
   Closes the loop on autoSuggestMatches above — pre-filling candidates is
   only a win if someone actually looks at them. Flags any match still sitting
   at SUGGESTED (never shortlisted, released or declined) after a couple of
   days, whether it was auto-created or added by hand, so the new automation
   never quietly creates a queue nobody reviews. */

const STALE_SUGGESTION_HOURS = 48;

export async function runStaleSuggestionWatchdog() {
  const cutoff = new Date(Date.now() - STALE_SUGGESTION_HOURS * 60 * 60 * 1000);
  const stale = await db.match.findMany({
    where: { status: "SUGGESTED", createdAt: { lte: cutoff } },
    select: {
      id: true,
      createdAt: true,
      requestId: true,
      partnerId: true,
      request: { select: { reference: true } },
      partner: { select: { displayName: true } },
    },
  });

  let sent = 0;
  for (const match of stale) {
    const action = "watchdog.stale_suggestion";
    if (await alreadyAlerted(action, match.id)) continue;

    const hours = Math.round((Date.now() - match.createdAt.getTime()) / 3_600_000);
    const ok = await sendTelegramAlert(
      `🕵️ <b>Suggested match unreviewed</b>\n${match.request.reference} — ${match.partner.displayName}\n` +
        `Still sitting at Suggested after ${hours}h. Review, shortlist, or decline.`,
    );
    if (!ok) continue;

    await audit({
      action,
      entityType: "Match",
      entityId: match.id,
      actorLabel: "Watchdog",
      requestId: match.requestId,
      partnerId: match.partnerId,
      matchId: match.id,
      meta: { hoursElapsed: hours },
    });
    sent++;
  }
  return { checked: stale.length, sent };
}
