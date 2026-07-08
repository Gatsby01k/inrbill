"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentSchema, noteSchema, partnerOpsSchema } from "@/lib/schemas";

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function arr(fd: FormData, key: string) {
  return fd.getAll(key).filter((v): v is string => typeof v === "string");
}

function finish(path: string): never {
  revalidatePath(path);
  redirect(path);
}

function fail(path: string, msg: string): never {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

/* ── Company ──────────────────────────────────────────────────────────────── */

async function ownedRequest(requestId: string) {
  const user = await requireRole("COMPANY");
  if (!user.company) redirect("/login");
  const request = await db.liquidityRequest.findUnique({ where: { id: requestId } });
  if (!request || request.companyId !== user.company.id) redirect("/company");
  return { user, company: user.company, request };
}

export async function addCompanyNote(fd: FormData) {
  const requestId = s(fd, "requestId");
  const { user, company, request } = await ownedRequest(requestId);
  const path = `/company/requests/${request.id}`;

  const parsed = noteSchema.safeParse({ body: s(fd, "body"), visibility: "COMPANY" });
  if (!parsed.success) fail(path, "Note text is required.");

  const note = await db.note.create({
    data: {
      body: parsed.data.body,
      visibility: "COMPANY",
      authorLabel: company.companyName,
      authorId: user.id,
      requestId: request.id,
    },
  });
  await audit({
    action: "note.added",
    entityType: "Note",
    entityId: note.id,
    actorId: user.id,
    actorLabel: company.companyName,
    requestId: request.id,
    meta: { visibility: "COMPANY" },
  });
  finish(path);
}

export async function addCompanyDocument(fd: FormData) {
  const requestId = s(fd, "requestId");
  const { user, company, request } = await ownedRequest(requestId);
  const path = `/company/requests/${request.id}`;

  const parsed = documentSchema.safeParse({
    title: s(fd, "title"),
    url: s(fd, "url"),
    note: s(fd, "note"),
    visibility: "COMPANY",
  });
  if (!parsed.success) fail(path, "Document title is required.");

  const doc = await db.documentRecord.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url,
      note: parsed.data.note,
      visibility: "COMPANY",
      authorLabel: company.companyName,
      authorId: user.id,
      requestId: request.id,
    },
  });
  await audit({
    action: "document.added",
    entityType: "DocumentRecord",
    entityId: doc.id,
    actorId: user.id,
    actorLabel: company.companyName,
    requestId: request.id,
    meta: { title: parsed.data.title },
  });
  finish(path);
}

/* ── Partner ──────────────────────────────────────────────────────────────── */

async function ownPartner() {
  const user = await requireRole("PARTNER");
  if (!user.partner) redirect("/login");
  return { user, partner: user.partner };
}

export async function addPartnerNote(fd: FormData) {
  const { user, partner } = await ownPartner();
  const path = "/partner";

  const parsed = noteSchema.safeParse({ body: s(fd, "body"), visibility: "PARTNER" });
  if (!parsed.success) fail(path, "Note text is required.");

  const note = await db.note.create({
    data: {
      body: parsed.data.body,
      visibility: "PARTNER",
      authorLabel: partner.displayName,
      authorId: user.id,
      partnerId: partner.id,
    },
  });
  await audit({
    action: "note.added",
    entityType: "Note",
    entityId: note.id,
    actorId: user.id,
    actorLabel: partner.displayName,
    partnerId: partner.id,
    meta: { visibility: "PARTNER" },
  });
  finish(path);
}

export async function addPartnerDocument(fd: FormData) {
  const { user, partner } = await ownPartner();
  const path = "/partner";

  const parsed = documentSchema.safeParse({
    title: s(fd, "title"),
    url: s(fd, "url"),
    note: s(fd, "note"),
    visibility: "PARTNER",
  });
  if (!parsed.success) fail(path, "Document title is required.");

  const doc = await db.documentRecord.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url,
      note: parsed.data.note,
      visibility: "PARTNER",
      authorLabel: partner.displayName,
      authorId: user.id,
      partnerId: partner.id,
    },
  });
  await audit({
    action: "document.added",
    entityType: "DocumentRecord",
    entityId: doc.id,
    actorId: user.id,
    actorLabel: partner.displayName,
    partnerId: partner.id,
    meta: { title: parsed.data.title },
  });
  finish(path);
}

export async function updatePartnerOps(fd: FormData) {
  const { user, partner } = await ownPartner();
  const path = "/partner/profile";

  const parsed = partnerOpsSchema.safeParse({
    dailyCapacityBand: s(fd, "dailyCapacityBand"),
    monthlyCapacityBand: s(fd, "monthlyCapacityBand"),
    minTicket: s(fd, "minTicket"),
    maxTicket: s(fd, "maxTicket"),
    settlementPreference: s(fd, "settlementPreference"),
    workingHours: s(fd, "workingHours"),
    reserveBand: s(fd, "reserveBand"),
    banks: arr(fd, "banks"),
    methods: arr(fd, "methods"),
  });
  if (!parsed.success) {
    fail(path, "Check capacity, hours, reserve, and select at least one bank and method.");
  }

  const changed: string[] = [];
  if (parsed.data.dailyCapacityBand !== partner.dailyCapacityBand) changed.push("daily capacity");
  if (parsed.data.workingHours !== partner.workingHours) changed.push("working hours");
  if (parsed.data.reserveBand !== partner.reserveBand) changed.push("reserve");
  if (JSON.stringify(parsed.data.banks) !== JSON.stringify(partner.banks)) changed.push("banks");
  if (JSON.stringify(parsed.data.methods) !== JSON.stringify(partner.methods)) changed.push("methods");
  if (parsed.data.monthlyCapacityBand !== partner.monthlyCapacityBand) changed.push("monthly capacity");
  if (parsed.data.minTicket !== partner.minTicket) changed.push("min ticket");
  if (parsed.data.maxTicket !== partner.maxTicket) changed.push("max ticket");
  if (parsed.data.settlementPreference !== partner.settlementPreference) changed.push("settlement preference");

  if (changed.length) {
    await db.partnerProfile.update({
      where: { id: partner.id },
      data: {
        dailyCapacityBand: parsed.data.dailyCapacityBand,
        monthlyCapacityBand: parsed.data.monthlyCapacityBand,
        minTicket: parsed.data.minTicket,
        maxTicket: parsed.data.maxTicket,
        settlementPreference: parsed.data.settlementPreference,
        workingHours: parsed.data.workingHours,
        reserveBand: parsed.data.reserveBand,
        banks: parsed.data.banks,
        methods: parsed.data.methods,
      },
    });
    await audit({
      action: "partner.profile_updated",
      entityType: "PartnerProfile",
      entityId: partner.id,
      actorId: user.id,
      actorLabel: partner.displayName,
      partnerId: partner.id,
      meta: { changed },
    });
  }
  finish(path);
}
