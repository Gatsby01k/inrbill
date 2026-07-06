"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documentSchema,
  introductionCreateSchema,
  introductionStatusSchema,
  matchCreateSchema,
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
      meta: { partnerName: partner.displayName, requestRef: request.reference },
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
    include: { match: true },
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
  }
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
    basis: s(fd, "basis"),
    matchId: s(fd, "matchId"),
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
      basis: parsed.data.basis,
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
    meta: { amount: parsed.data.amount, currency: parsed.data.currency },
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
