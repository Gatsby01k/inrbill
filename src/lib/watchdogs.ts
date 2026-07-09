import type { Direction } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { directionLabel } from "@/lib/format";
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
    },
  });

  let sent = 0;
  for (const rev of overdue) {
    const action = "watchdog.revenue_overdue";
    if (await alreadyAlerted(action, rev.id)) continue;

    const days = rev.dueDate ? Math.round((now.getTime() - rev.dueDate.getTime()) / 86_400_000) : 0;
    const ok = await sendTelegramAlert(
      `💸 <b>Revenue overdue</b>\n${rev.request.reference} — ₹${rev.amount.toString()} ${rev.currency}\n` +
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

/* ── 3. Coverage-gap watchdog ─────────────────────────────────────────────
   Not cron-driven — fired synchronously the moment a request is created,
   reusing the same scoreMatch() the admin "suggested partners" panel uses.
   If nobody in the network can plausibly fill this, operations should know
   in seconds, not whenever someone happens to open the request. Never
   throws — a failure here must not break the company's submission flow. */

const COVERAGE_GAP_SCORE_THRESHOLD = 35;

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
