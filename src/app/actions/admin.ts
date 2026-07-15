"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { revenueTypeLabel } from "@/lib/format";
import { draftIntroductionSummary } from "@/lib/matching";
import { notify } from "@/lib/notify";
import { createCryptoInvoice } from "@/lib/nowpayments";
import { createPaymentLink } from "@/lib/razorpay";
import { canTransitionPartner, canTransitionRequest } from "@/lib/state-machine";
import {
  documentSchema,
  introductionCreateSchema,
  introductionStatusSchema,
  introOutcomeSchema,
  matchCreateSchema,
  matchDecisionSchema,
  matchStatusSchema,
  noteSchema,
  partnerStatusSchema,
  requestStatusSchema,
  retainerSchema,
  revenueSchema,
  revenueStatusSchema,
} from "@/lib/schemas";

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function backPath(fd: FormData, fallback: string) {
  const b = s(fd, "back");
  return b.startsWith("/") && !b.startsWith("//") ? b : fallback;
}

function done(fd: FormData, fallback: string): never {
  const back = backPath(fd, fallback);
  revalidatePath(back);
  redirect(back);
}

function fail(fd: FormData, fallback: string, msg: string): never {
  redirect(`${backPath(fd, fallback)}?error=${encodeURIComponent(msg)}`);
}

/* ── Requests ─────────────────────────────────────────────────────────────── */

export async function updateRequestStatus(fd: FormData) {
  const user = await requireRole("ADMIN");
  const requestId = s(fd, "requestId");
  const status = requestStatusSchema.safeParse(s(fd, "status"));
  if (!requestId || !status.success) fail(fd, "/admin/requests", "Invalid status update.");

  const existing = await db.liquidityRequest.findUnique({ where: { id: requestId } });
  if (!existing) fail(fd, "/admin/requests", "Request not found.");
  if (!canTransitionRequest(existing.status, status.data)) fail(fd, `/admin/requests/${requestId}`, `Request cannot move directly from ${existing.status} to ${status.data}.`);

  if (existing.status !== status.data) {
    await db.liquidityRequest.update({
      where: { id: requestId },
      data: { status: status.data },
    });
    await audit({
      action: "request.status_changed",
      entityType: "LiquidityRequest",
      entityId: requestId,
      actorId: user.id,
      actorLabel: "Operator",
      requestId,
      meta: { from: existing.status, to: status.data },
    });
  }
  done(fd, `/admin/requests/${requestId}`);
}

/* ── Partners ─────────────────────────────────────────────────────────────── */

export async function updatePartnerStatus(fd: FormData) {
  const user = await requireRole("ADMIN");
  const partnerId = s(fd, "partnerId");
  const status = partnerStatusSchema.safeParse(s(fd, "status"));
  if (!partnerId || !status.success) fail(fd, "/admin/partners", "Invalid status update.");

  const existing = await db.partnerProfile.findUnique({ where: { id: partnerId } });
  if (!existing) fail(fd, "/admin/partners", "Partner not found.");
  if (!canTransitionPartner(existing.status, status.data)) fail(fd, `/admin/partners/${partnerId}`, `Partner cannot move directly from ${existing.status} to ${status.data}.`);
  if (status.data === "VERIFIED") {
    const approved = await db.verificationCase.findFirst({ where: { partnerId, status: "APPROVED", expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!approved) fail(fd, `/admin/partners/${partnerId}`, "Verified status requires an approved, unexpired verification case.");
  }

  if (existing.status !== status.data) {
    await db.partnerProfile.update({
      where: { id: partnerId },
      data: {
        status: status.data,
        verifiedAt:
          status.data === "VERIFIED" && !existing.verifiedAt ? new Date() : existing.verifiedAt,
        tier: status.data === "VERIFIED" ? "VERIFIED" : status.data === "SUSPENDED" || status.data === "REJECTED" ? "RESTRICTED" : existing.tier,
      },
    });
    await audit({
      action: "partner.status_changed",
      entityType: "PartnerProfile",
      entityId: partnerId,
      actorId: user.id,
      actorLabel: "Operator",
      partnerId,
      meta: { from: existing.status, to: status.data },
    });
    if ((status.data === "VERIFIED" || status.data === "LIMITED") && existing.status !== status.data) {
      // Awaited (not fire-and-forget) — a serverless function can be frozen
      // the instant it returns, so an un-awaited push can simply never send.
      // notifyUser never throws (it's internally try/caught), so this can't
      // block the actual status update from completing.
      await notify(existing.userId, {
        title: status.data === "VERIFIED" ? "You're verified" : "Limited verification set",
        body:
          status.data === "VERIFIED"
            ? "Your partner profile is now fully verified and eligible for matching."
            : "Your partner profile now has Limited status and is eligible for matching, with some caveats.",
        telegramHtml:
          status.data === "VERIFIED"
            ? "✅ <b>You're verified</b>\nYour partner profile is now fully verified and eligible for matching on INRP2P."
            : "🟡 <b>Limited verification set</b>\nYour partner profile now has Limited status and is eligible for matching, with some caveats — check your workspace for details.",
        link: "/partner",
      });
    }
  }
  done(fd, `/admin/partners/${partnerId}`);
}

/* ── Matches ──────────────────────────────────────────────────────────────── */

export async function createMatch(fd: FormData) {
  const user = await requireRole("ADMIN");
  const requestId = s(fd, "requestId");
  const fallback = `/admin/requests/${requestId}`;
  const parsed = matchCreateSchema.safeParse({
    partnerId: s(fd, "partnerId"),
    adminNote: s(fd, "adminNote"),
    confidenceScore: s(fd, "confidenceScore") || undefined,
  });
  if (!requestId || !parsed.success) fail(fd, fallback, "Select a partner to match.");

  const [request, partner] = await Promise.all([
    db.liquidityRequest.findUnique({ where: { id: requestId } }),
    db.partnerProfile.findUnique({ where: { id: parsed.data.partnerId } }),
  ]);
  if (!request || !partner) fail(fd, fallback, "Request or partner not found.");

  try {
    const match = await db.match.create({
      data: {
        requestId,
        partnerId: partner.id,
        adminNote: parsed.data.adminNote,
        confidenceScore: parsed.data.confidenceScore,
      },
    });
    await audit({
      action: "match.created",
      entityType: "Match",
      entityId: match.id,
      actorId: user.id,
      actorLabel: "Operator",
      requestId,
      partnerId: partner.id,
      matchId: match.id,
      meta: {
        partnerName: partner.displayName,
        requestRef: request.reference,
        ...(parsed.data.confidenceScore != null
          ? { suggested: true, confidenceScore: parsed.data.confidenceScore }
          : {}),
      },
    });

    // A human just deliberately created this match — that's the real signal
    // that matching is under way, so the request's own status stops being
    // separate bookkeeping the operator has to remember to update by hand.
    if (request.status === "SUBMITTED" || request.status === "IN_REVIEW") {
      await db.liquidityRequest.update({ where: { id: requestId }, data: { status: "MATCHING" } });
      await audit({
        action: "request.status_changed",
        entityType: "LiquidityRequest",
        entityId: requestId,
        actorId: user.id,
        actorLabel: "Operator",
        requestId,
        meta: { from: request.status, to: "MATCHING", auto: true, reason: "match.created" },
      });
    }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      fail(fd, fallback, "This partner is already matched to the request.");
    }
    throw e;
  }
  done(fd, fallback);
}

export async function updateMatchStatus(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchId = s(fd, "matchId");
  const status = matchStatusSchema.safeParse(s(fd, "status"));
  if (!matchId || !status.success) fail(fd, "/admin/matches", "Invalid match update.");

  const existing = await db.match.findUnique({
    where: { id: matchId },
    include: { partner: true, request: true },
  });
  if (!existing) fail(fd, "/admin/matches", "Match not found.");

  if (existing.status !== status.data) {
    await db.match.update({ where: { id: matchId }, data: { status: status.data } });
    await audit({
      action: "match.status_changed",
      entityType: "Match",
      entityId: matchId,
      actorId: user.id,
      actorLabel: "Operator",
      requestId: existing.requestId,
      partnerId: existing.partnerId,
      matchId,
      meta: {
        from: existing.status,
        to: status.data,
        partnerName: existing.partner.displayName,
      },
    });
  }
  done(fd, `/admin/requests/${existing.requestId}`);
}

/** Decision-support fields only — never used to automate a financial decision. */
export async function updateMatchDecision(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchId = s(fd, "matchId");
  const parsed = matchDecisionSchema.safeParse({
    confidenceScore: s(fd, "confidenceScore") || undefined,
    nextAction: s(fd, "nextAction"),
  });
  if (!matchId || !parsed.success) fail(fd, "/admin/matches", "Invalid match update.");

  const existing = await db.match.findUnique({ where: { id: matchId } });
  if (!existing) fail(fd, "/admin/matches", "Match not found.");

  await db.match.update({
    where: { id: matchId },
    data: {
      confidenceScore: parsed.data.confidenceScore ?? null,
      nextAction: parsed.data.nextAction,
    },
  });
  await audit({
    action: "match.decision_updated",
    entityType: "Match",
    entityId: matchId,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: existing.requestId,
    partnerId: existing.partnerId,
    matchId,
    meta: { confidenceScore: parsed.data.confidenceScore, nextAction: parsed.data.nextAction },
  });
  done(fd, `/admin/requests/${existing.requestId}`);
}

export async function toggleMatchRelease(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchId = s(fd, "matchId");
  const side = s(fd, "side"); // "company" | "partner"
  if (!matchId || (side !== "company" && side !== "partner")) {
    fail(fd, "/admin/matches", "Invalid release update.");
  }

  const existing = await db.match.findUnique({
    where: { id: matchId },
    include: { partner: true },
  });
  if (!existing) fail(fd, "/admin/matches", "Match not found.");

  const next =
    side === "company" ? !existing.releasedToCompany : !existing.releasedToPartner;
  await db.match.update({
    where: { id: matchId },
    data: side === "company" ? { releasedToCompany: next } : { releasedToPartner: next },
  });
  await audit({
    action: "match.release_changed",
    entityType: "Match",
    entityId: matchId,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: existing.requestId,
    partnerId: existing.partnerId,
    matchId,
    meta: { side, released: next, partnerName: existing.partner.displayName },
  });
  done(fd, `/admin/requests/${existing.requestId}`);
}

/* ── Introductions ────────────────────────────────────────────────────────── */

export async function createIntroduction(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchId = s(fd, "matchId");
  const parsed = introductionCreateSchema.safeParse({
    channel: s(fd, "channel"),
    summary: s(fd, "summary"),
  });
  if (!matchId || !parsed.success) fail(fd, "/admin/matches", "Invalid introduction.");

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { partner: true },
  });
  if (!match) fail(fd, "/admin/matches", "Match not found.");

  const intro = await db.introduction.create({
    data: {
      matchId,
      channel: parsed.data.channel,
      summary: parsed.data.summary,
    },
  });
  await audit({
    action: "introduction.created",
    entityType: "Introduction",
    entityId: intro.id,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: match.requestId,
    partnerId: match.partnerId,
    matchId,
    meta: { channel: parsed.data.channel, partnerName: match.partner.displayName },
  });
  done(fd, `/admin/requests/${match.requestId}`);
}

/**
 * Collapses the common happy-path — release to both sides, draft the
 * introduction, send it — into one click instead of four separate forms.
 * Only meant for a match the operator already trusts (typically a strong
 * auto-suggested one); every field it sets remains editable afterwards
 * through the normal per-step controls, so nothing here is a one-way door.
 */
/**
 * The actual work of "Approve & introduce", pulled out of the form action so
 * it can also be driven in a loop by bulkApproveAndIntroduce without each
 * iteration triggering Next's redirect() (which throws to unwind the
 * request — fine once per form submit, not fine inside a for-loop). Returns
 * false (never throws) for a missing match so a bulk caller can just skip it.
 */
async function approveAndIntroduceCore(matchId: string, actorId: string): Promise<boolean> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { request: { include: { company: true } }, partner: true, introductions: true },
  });
  if (!match) return false;

  if (!match.releasedToCompany || !match.releasedToPartner) {
    await db.match.update({
      where: { id: matchId },
      data: { releasedToCompany: true, releasedToPartner: true },
    });
    await audit({
      action: "match.release_changed",
      entityType: "Match",
      entityId: matchId,
      actorId,
      actorLabel: "Operator",
      requestId: match.requestId,
      partnerId: match.partnerId,
      matchId,
      meta: { side: "both", released: true, partnerName: match.partner.displayName, viaApprove: true },
    });
  }

  if (match.introductions.length === 0) {
    const summary = draftIntroductionSummary(match.request, match.partner);
    const intro = await db.introduction.create({
      data: {
        matchId,
        channel: "TELEGRAM",
        summary,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    await audit({
      action: "introduction.created",
      entityType: "Introduction",
      entityId: intro.id,
      actorId,
      actorLabel: "Operator",
      requestId: match.requestId,
      partnerId: match.partnerId,
      matchId,
      meta: { channel: "TELEGRAM", partnerName: match.partner.displayName, viaApprove: true },
    });
    await notifyIntroductionSentAndAdvanceRequest(
      { requestId: match.requestId, partnerId: match.partnerId, request: match.request, partner: match.partner },
      actorId,
    );
  }

  return true;
}

export async function approveAndIntroduce(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchId = s(fd, "matchId");
  if (!matchId) fail(fd, "/admin/matches", "Match not found.");

  const fallback = `/admin/requests/${matchId}`;
  const ok = await approveAndIntroduceCore(matchId, user.id);
  if (!ok) fail(fd, "/admin/matches", "Match not found.");

  const match = await db.match.findUnique({ where: { id: matchId }, select: { requestId: true } });
  done(fd, match ? `/admin/requests/${match.requestId}` : fallback);
}

/** Same one-click flow as approveAndIntroduce, applied to every checked row
    on the matches list in one submit — the bulk-review counterpart to
    reviewing suggested matches one request at a time. */
export async function bulkApproveAndIntroduce(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchIds = fd.getAll("matchIds").map(String).filter(Boolean);
  const back = backPath(fd, "/admin/matches");
  if (matchIds.length === 0) fail(fd, "/admin/matches", "No matches selected.");

  let ok = 0;
  for (const matchId of matchIds) {
    try {
      if (await approveAndIntroduceCore(matchId, user.id)) ok++;
    } catch (err) {
      console.error("bulkApproveAndIntroduce: failed for match", matchId, err);
    }
  }
  revalidatePath(back);
  redirect(ok === matchIds.length ? back : `${back}?error=${encodeURIComponent(`${ok}/${matchIds.length} approved — check the rest.`)}`);
}

/** Bulk-decline — the "no" counterpart to bulk approve, for suggestions that
    clearly don't fit once an operator has scanned a batch of them. */
export async function bulkDeclineMatches(fd: FormData) {
  const user = await requireRole("ADMIN");
  const matchIds = fd.getAll("matchIds").map(String).filter(Boolean);
  const back = backPath(fd, "/admin/matches");
  if (matchIds.length === 0) fail(fd, "/admin/matches", "No matches selected.");

  const matches = await db.match.findMany({
    where: { id: { in: matchIds } },
    select: { id: true, status: true, requestId: true, partnerId: true },
  });
  for (const m of matches) {
    if (m.status === "DECLINED") continue;
    await db.match.update({ where: { id: m.id }, data: { status: "DECLINED" } });
    await audit({
      action: "match.status_changed",
      entityType: "Match",
      entityId: m.id,
      actorId: user.id,
      actorLabel: "Operator",
      requestId: m.requestId,
      partnerId: m.partnerId,
      matchId: m.id,
      meta: { from: m.status, to: "DECLINED", bulk: true },
    });
  }
  revalidatePath(back);
  redirect(back);
}

/**
 * Shared by updateIntroductionStatus and approveAndIntroduce — both are
 * "this introduction just went out" moments and both deserve the exact same
 * side effects: both sides notified on Telegram, and the request's own
 * status auto-advanced instead of left as separate bookkeeping.
 */
async function notifyIntroductionSentAndAdvanceRequest(
  match: {
    requestId: string;
    partnerId: string;
    request: { reference: string; status: string; company: { userId: string } };
    partner: { userId: string };
  },
  actorId: string,
) {
  await Promise.all([
    notify(match.request.company.userId, {
      title: "You've been introduced",
      body: `Request ${match.request.reference} — a partner introduction just went out.`,
      telegramHtml: `🤝 <b>You've been introduced</b>\nRequest ${match.request.reference} — a partner introduction just went out. Check your workspace for details.`,
      link: `/company/requests/${match.requestId}`,
    }),
    notify(match.partner.userId, {
      title: "New introduction",
      body: `You've just been introduced for request ${match.request.reference}.`,
      telegramHtml: `🤝 <b>New introduction</b>\nYou've just been introduced for request ${match.request.reference}. Check your workspace for details.`,
      link: "/partner",
    }),
  ]);

  const reqStatus = match.request.status;
  if (reqStatus !== "INTRODUCED" && reqStatus !== "CLOSED" && reqStatus !== "REJECTED") {
    await db.liquidityRequest.update({ where: { id: match.requestId }, data: { status: "INTRODUCED" } });
    await audit({
      action: "request.status_changed",
      entityType: "LiquidityRequest",
      entityId: match.requestId,
      actorId,
      actorLabel: "Operator",
      requestId: match.requestId,
      meta: { from: reqStatus, to: "INTRODUCED", auto: true, reason: "introduction.sent" },
    });
  }
}

export async function updateIntroductionStatus(fd: FormData) {
  const user = await requireRole("ADMIN");
  const introId = s(fd, "introductionId");
  const status = introductionStatusSchema.safeParse(s(fd, "status"));
  if (!introId || !status.success) fail(fd, "/admin/matches", "Invalid introduction update.");

  const existing = await db.introduction.findUnique({
    where: { id: introId },
    include: { match: { include: { request: { include: { company: true } }, partner: true } } },
  });
  if (!existing) fail(fd, "/admin/matches", "Introduction not found.");

  if (existing.status !== status.data) {
    await db.introduction.update({
      where: { id: introId },
      data: {
        status: status.data,
        sentAt: status.data === "SENT" && !existing.sentAt ? new Date() : existing.sentAt,
        respondedAt:
          ["RESPONDED", "SUCCESSFUL", "FAILED"].includes(status.data) && !existing.respondedAt
            ? new Date()
            : existing.respondedAt,
      },
    });
    await audit({
      action: "introduction.status_changed",
      entityType: "Introduction",
      entityId: introId,
      actorId: user.id,
      actorLabel: "Operator",
      requestId: existing.match.requestId,
      partnerId: existing.match.partnerId,
      matchId: existing.matchId,
      meta: { from: existing.status, to: status.data },
    });
    if (status.data === "SENT" && existing.status !== "SENT") {
      // Both sides find out the moment it happens, not whenever they next
      // happen to open their workspace — awaited, never blocks or throws.
      await notifyIntroductionSentAndAdvanceRequest(existing.match, user.id);
    }
  }
  done(fd, `/admin/requests/${existing.match.requestId}`);
}

export async function updateIntroductionOutcome(fd: FormData) {
  const user = await requireRole("ADMIN");
  const introId = s(fd, "introductionId");
  const parsed = introOutcomeSchema.safeParse({
    outcome: s(fd, "outcome"),
    followUpDate: s(fd, "followUpDate"),
    settledRate: s(fd, "settledRate") || undefined,
  });
  if (!introId || !parsed.success) fail(fd, "/admin/matches", "Invalid introduction update.");

  const existing = await db.introduction.findUnique({
    where: { id: introId },
    include: { match: { include: { request: true } } },
  });
  if (!existing) fail(fd, "/admin/matches", "Introduction not found.");

  // Rate only means something on a real conversion corridor — silently drop
  // it rather than let a stray value land against an INR_PAYOUTS deal.
  const direction = existing.match.request.direction;
  const settledRate =
    parsed.data.settledRate != null && (direction === "INR_TO_USDT" || direction === "USDT_TO_INR")
      ? parsed.data.settledRate
      : null;

  await db.introduction.update({
    where: { id: introId },
    data: {
      outcome: parsed.data.outcome,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
      settledRate,
    },
  });
  await audit({
    action: "introduction.outcome_updated",
    entityType: "Introduction",
    entityId: introId,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: existing.match.requestId,
    partnerId: existing.match.partnerId,
    matchId: existing.matchId,
    meta: { outcome: parsed.data.outcome, followUpDate: parsed.data.followUpDate, settledRate },
  });
  done(fd, `/admin/requests/${existing.match.requestId}`);
}

/* ── Revenue ──────────────────────────────────────────────────────────────── */

export async function addRevenue(fd: FormData) {
  const user = await requireRole("ADMIN");
  const requestId = s(fd, "requestId");
  const fallback = requestId ? `/admin/requests/${requestId}` : "/admin/revenue";
  const parsed = revenueSchema.safeParse({
    amount: s(fd, "amount"),
    currency: s(fd, "currency"),
    type: s(fd, "type") || "CUSTOM",
    payerType: s(fd, "payerType"),
    payerName: s(fd, "payerName"),
    basis: s(fd, "basis"),
    matchId: s(fd, "matchId"),
    dueDate: s(fd, "dueDate"),
  });
  if (!requestId || !parsed.success) fail(fd, fallback, "Enter a valid amount and currency.");

  const request = await db.liquidityRequest.findUnique({ where: { id: requestId } });
  if (!request) fail(fd, fallback, "Request not found.");

  let matchId: string | null = null;
  if (parsed.data.matchId) {
    const match = await db.match.findUnique({ where: { id: parsed.data.matchId } });
    if (match && match.requestId === requestId) matchId = match.id;
  }

  const record = await db.revenueRecord.create({
    data: {
      requestId,
      matchId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      type: parsed.data.type,
      payerType: parsed.data.payerType,
      payerName: parsed.data.payerName,
      basis: parsed.data.basis,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });
  await audit({
    action: "revenue.created",
    entityType: "RevenueRecord",
    entityId: record.id,
    actorId: user.id,
    actorLabel: "Operator",
    requestId,
    matchId,
    meta: { amount: parsed.data.amount, currency: parsed.data.currency, type: parsed.data.type },
  });
  done(fd, fallback);
}

export async function updateRevenueStatus(fd: FormData) {
  const user = await requireRole("ADMIN");
  const revenueId = s(fd, "revenueId");
  const status = revenueStatusSchema.safeParse(s(fd, "status"));
  if (!revenueId || !status.success) fail(fd, "/admin/revenue", "Invalid revenue update.");

  const existing = await db.revenueRecord.findUnique({ where: { id: revenueId } });
  if (!existing) fail(fd, "/admin/revenue", "Revenue record not found.");

  if (existing.status !== status.data) {
    await db.revenueRecord.update({
      where: { id: revenueId },
      data: {
        status: status.data,
        invoicedAt:
          status.data === "INVOICED" && !existing.invoicedAt ? new Date() : existing.invoicedAt,
        paidAt: status.data === "PAID" && !existing.paidAt ? new Date() : existing.paidAt,
      },
    });
    await audit({
      action: "revenue.status_changed",
      entityType: "RevenueRecord",
      entityId: revenueId,
      actorId: user.id,
      actorLabel: "Operator",
      requestId: existing.requestId,
      matchId: existing.matchId,
      meta: { from: existing.status, to: status.data },
    });
  }
  done(fd, existing.requestId ? `/admin/requests/${existing.requestId}` : "/admin/revenue");
}

/**
 * Turns a monthly retainer on/off for a company and sets its billing terms.
 * The retainer-renewal watchdog (src/lib/watchdogs.ts) reads retainerActive/
 * retainerNextRenewal on its own schedule and creates the actual RevenueRecord
 * each cycle — this action only owns the company-level configuration.
 */
export async function updateCompanyRetainer(fd: FormData) {
  const user = await requireRole("ADMIN");
  const companyId = s(fd, "companyId");
  const fallback = companyId ? `/admin/requests` : "/admin/revenue";
  if (!companyId) fail(fd, fallback, "Company not found.");

  const company = await db.companyProfile.findUnique({ where: { id: companyId } });
  if (!company) fail(fd, fallback, "Company not found.");

  const parsed = retainerSchema.safeParse({
    retainerActive: s(fd, "retainerActive") === "on",
    retainerAmount: s(fd, "retainerAmount"),
    retainerCurrency: s(fd, "retainerCurrency"),
    retainerDayOfMonth: s(fd, "retainerDayOfMonth"),
  });
  if (!parsed.success) fail(fd, fallback, "Enter a valid retainer amount, currency and billing day.");

  if (!parsed.data.retainerActive) {
    await db.companyProfile.update({
      where: { id: companyId },
      data: { retainerActive: false },
    });
    await audit({
      action: "company.retainer_disabled",
      entityType: "CompanyProfile",
      entityId: companyId,
      actorId: user.id,
      actorLabel: "Operator",
      meta: {},
    });
    done(fd, fallback);
  }

  if (!parsed.data.retainerAmount || !parsed.data.retainerCurrency || !parsed.data.retainerDayOfMonth) {
    fail(fd, fallback, "Amount, currency and billing day are all required to activate a retainer.");
  }

  const dayOfMonth = parsed.data.retainerDayOfMonth;
  const wasActive = company.retainerActive;
  const dayChanged = company.retainerDayOfMonth !== dayOfMonth;

  let nextRenewal = company.retainerNextRenewal;
  if (!wasActive || !nextRenewal || dayChanged) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 9, 0, 0);
    nextRenewal = thisMonth > now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, 9, 0, 0);
  }

  await db.companyProfile.update({
    where: { id: companyId },
    data: {
      retainerActive: true,
      retainerAmount: parsed.data.retainerAmount,
      retainerCurrency: parsed.data.retainerCurrency,
      retainerDayOfMonth: dayOfMonth,
      retainerNextRenewal: nextRenewal,
    },
  });
  await audit({
    action: "company.retainer_updated",
    entityType: "CompanyProfile",
    entityId: companyId,
    actorId: user.id,
    actorLabel: "Operator",
    meta: {
      amount: parsed.data.retainerAmount,
      currency: parsed.data.retainerCurrency,
      dayOfMonth,
      nextRenewal: nextRenewal.toISOString(),
    },
  });
  done(fd, fallback);
}

/**
 * Generates a Razorpay Payment Link for one of INRP2P's own service-fee
 * RevenueRecords and stores the result. This is strictly about collecting
 * INRP2P's own fee — it never represents or moves the underlying P2P trade
 * funds between company and partner. Idempotent: if a link already exists
 * on the record, this just returns to the page without calling Razorpay
 * again. The manual `updateRevenueStatus` action above remains the fallback
 * path for bank-transfer payments that don't go through Razorpay at all.
 */
export async function createRevenuePaymentLink(fd: FormData) {
  const user = await requireRole("ADMIN");
  const revenueId = s(fd, "revenueId");
  const fallback = "/admin/revenue";
  if (!revenueId) fail(fd, fallback, "Revenue record not found.");

  const existing = await db.revenueRecord.findUnique({
    where: { id: revenueId },
    include: {
      request: { include: { company: { include: { user: { select: { email: true } } } } } },
      company: { include: { user: { select: { email: true } } } },
    },
  });
  if (!existing) fail(fd, fallback, "Revenue record not found.");

  if (existing.paymentLinkUrl) done(fd, fallback);

  if (existing.currency !== "INR") {
    fail(fd, fallback, "Razorpay payment links only support INR — this record is in a different currency.");
  }
  if (["PAID", "CANCELLED", "LOST", "WAIVED"].includes(existing.status)) {
    fail(fd, fallback, "This revenue record is no longer collectible — change its status first.");
  }

  // Retainer revenue (no linked request) bills the company directly instead.
  const billTo = existing.request?.company ?? existing.company;
  if (!billTo) fail(fd, fallback, "This revenue record has no linked request or company to bill.");

  const description = [
    revenueTypeLabel(existing.type),
    existing.request ? `Request ${existing.request.reference}` : `Retainer — ${billTo.companyName}`,
    existing.basis,
  ]
    .filter(Boolean)
    .join(" — ");

  const link = await createPaymentLink({
    amountRupees: Number(existing.amount),
    description,
    referenceId: existing.id,
    customerName: existing.payerName ?? billTo.companyName,
    customerEmail: billTo.user.email,
  });

  if (!link) {
    fail(
      fd,
      fallback,
      "Couldn't create a Razorpay payment link — check RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are set correctly, or try again in a moment.",
    );
  }

  await db.revenueRecord.update({
    where: { id: revenueId },
    data: {
      paymentLinkId: link.id,
      paymentLinkUrl: link.shortUrl,
      status: ["POTENTIAL", "QUOTED", "AGREED"].includes(existing.status) ? "INVOICED" : existing.status,
      invoicedAt: existing.invoicedAt ?? new Date(),
    },
  });

  await audit({
    action: "revenue.payment_link_created",
    entityType: "RevenueRecord",
    entityId: revenueId,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: existing.requestId,
    matchId: existing.matchId,
    meta: { paymentLinkId: link.id, amount: existing.amount.toString(), currency: existing.currency },
  });

  done(fd, fallback);
}

/**
 * Generates a NOWPayments hosted USDT invoice for one of INRP2P's own
 * service-fee RevenueRecords, for the case where the payer settles in
 * crypto instead of INR. Same boundary and same idempotent/status-guard
 * shape as `createRevenuePaymentLink` above — this is strictly INRP2P's
 * own fee, never the underlying P2P trade funds.
 */
export async function createRevenueCryptoInvoice(fd: FormData) {
  const user = await requireRole("ADMIN");
  const revenueId = s(fd, "revenueId");
  const fallback = "/admin/revenue";
  if (!revenueId) fail(fd, fallback, "Revenue record not found.");

  const existing = await db.revenueRecord.findUnique({
    where: { id: revenueId },
    include: { request: true, company: true },
  });
  if (!existing) fail(fd, fallback, "Revenue record not found.");

  if (existing.cryptoInvoiceUrl) done(fd, fallback);

  if (existing.currency !== "USDT") {
    fail(fd, fallback, "NOWPayments invoices only support USDT — this record is in a different currency.");
  }
  if (["PAID", "CANCELLED", "LOST", "WAIVED"].includes(existing.status)) {
    fail(fd, fallback, "This revenue record is no longer collectible — change its status first.");
  }

  const description = [
    revenueTypeLabel(existing.type),
    existing.request
      ? `Request ${existing.request.reference}`
      : `Retainer — ${existing.company?.companyName ?? existing.payerName ?? "company"}`,
    existing.basis,
  ]
    .filter(Boolean)
    .join(" — ");

  const invoice = await createCryptoInvoice({
    amountUsdt: Number(existing.amount),
    description,
    orderId: existing.id,
  });

  if (!invoice) {
    fail(
      fd,
      fallback,
      "Couldn't create a NOWPayments invoice — check NOWPAYMENTS_API_KEY is set correctly, or try again in a moment.",
    );
  }

  await db.revenueRecord.update({
    where: { id: revenueId },
    data: {
      cryptoInvoiceId: invoice.id,
      cryptoInvoiceUrl: invoice.invoiceUrl,
      status: ["POTENTIAL", "QUOTED", "AGREED"].includes(existing.status) ? "INVOICED" : existing.status,
      invoicedAt: existing.invoicedAt ?? new Date(),
    },
  });

  await audit({
    action: "revenue.crypto_invoice_created",
    entityType: "RevenueRecord",
    entityId: revenueId,
    actorId: user.id,
    actorLabel: "Operator",
    requestId: existing.requestId,
    matchId: existing.matchId,
    meta: { cryptoInvoiceId: invoice.id, amount: existing.amount.toString(), currency: existing.currency },
  });

  done(fd, fallback);
}

/* ── Notes & documents ────────────────────────────────────────────────────── */

export async function addNote(fd: FormData) {
  const user = await requireRole("ADMIN");
  const requestId = s(fd, "requestId") || null;
  const partnerId = s(fd, "partnerId") || null;
  const fallback = requestId
    ? `/admin/requests/${requestId}`
    : partnerId
      ? `/admin/partners/${partnerId}`
      : "/admin";
  const parsed = noteSchema.safeParse({
    body: s(fd, "body"),
    visibility: s(fd, "visibility"),
  });
  if (!parsed.success || (!requestId && !partnerId)) {
    fail(fd, fallback, "Note text is required.");
  }

  const note = await db.note.create({
    data: {
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      authorLabel: "Operator",
      authorId: user.id,
      requestId,
      partnerId,
    },
  });
  await audit({
    action: "note.added",
    entityType: "Note",
    entityId: note.id,
    actorId: user.id,
    actorLabel: "Operator",
    requestId,
    partnerId,
    meta: { visibility: parsed.data.visibility },
  });
  done(fd, fallback);
}

export async function addDocument(fd: FormData) {
  const user = await requireRole("ADMIN");
  const requestId = s(fd, "requestId") || null;
  const partnerId = s(fd, "partnerId") || null;
  const fallback = requestId
    ? `/admin/requests/${requestId}`
    : partnerId
      ? `/admin/partners/${partnerId}`
      : "/admin";
  const parsed = documentSchema.safeParse({
    title: s(fd, "title"),
    url: s(fd, "url"),
    note: s(fd, "note"),
    visibility: s(fd, "visibility"),
  });
  if (!parsed.success || (!requestId && !partnerId)) {
    fail(fd, fallback, "Document title is required.");
  }

  const doc = await db.documentRecord.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url,
      note: parsed.data.note,
      visibility: parsed.data.visibility,
      authorLabel: "Operator",
      authorId: user.id,
      requestId,
      partnerId,
    },
  });
  await audit({
    action: "document.added",
    entityType: "DocumentRecord",
    entityId: doc.id,
    actorId: user.id,
    actorLabel: "Operator",
    requestId,
    partnerId,
    meta: { title: parsed.data.title },
  });
  done(fd, fallback);
}
