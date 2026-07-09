"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { revenueTypeLabel } from "@/lib/format";
import { createCryptoInvoice } from "@/lib/nowpayments";
import { createPaymentLink } from "@/lib/razorpay";
import { notifyUser } from "@/lib/telegram";
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

  if (existing.status !== status.data) {
    await db.partnerProfile.update({
      where: { id: partnerId },
      data: {
        status: status.data,
        verifiedAt:
          status.data === "VERIFIED" && !existing.verifiedAt ? new Date() : existing.verifiedAt,
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
      await notifyUser(
        existing.userId,
        status.data === "VERIFIED"
          ? "✅ <b>You're verified</b>\nYour partner profile is now fully verified and eligible for matching on INRP2P."
          : "🟡 <b>Limited verification set</b>\nYour partner profile now has Limited status and is eligible for matching, with some caveats — check your workspace for details.",
      );
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
      // happen to open their workspace. Awaited for the same reason as the
      // partner-verification push above — never throws, never blocks.
      await Promise.all([
        notifyUser(
          existing.match.request.company.userId,
          `🤝 <b>You've been introduced</b>\nRequest ${existing.match.request.reference} — a partner introduction just went out. Check your workspace for details.`,
        ),
        notifyUser(
          existing.match.partner.userId,
          `🤝 <b>New introduction</b>\nYou've just been introduced for request ${existing.match.request.reference}. Check your workspace for details.`,
        ),
      ]);
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
  done(fd, `/admin/requests/${existing.requestId}`);
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

  const description = [
    revenueTypeLabel(existing.type),
    `Request ${existing.request.reference}`,
    existing.basis,
  ]
    .filter(Boolean)
    .join(" — ");

  const link = await createPaymentLink({
    amountRupees: Number(existing.amount),
    description,
    referenceId: existing.id,
    customerName: existing.payerName ?? existing.request.company.companyName,
    customerEmail: existing.request.company.user.email,
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
    include: { request: true },
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
    `Request ${existing.request.reference}`,
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
