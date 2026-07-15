"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CapacityStatus, Direction, Prisma, VerificationCheckStatus } from "@prisma/client";
import { audit } from "@/lib/audit";
import { actorLabel, requireRole, requireVerifiedRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyOrganization } from "@/lib/network";
import { rankCandidates } from "@/lib/routing";
import { createReference } from "@/lib/secure-token";
import { runProviderCheck } from "@/lib/verification-providers";

function value(fd: FormData, key: string) { const raw = fd.get(key); return typeof raw === "string" ? raw.trim() : ""; }
function values(fd: FormData, key: string) { return fd.getAll(key).filter((item): item is string => typeof item === "string" && !!item.trim()); }
function back(fd: FormData, fallback: string) { const target = value(fd, "back"); return target.startsWith("/") && !target.startsWith("//") ? target : fallback; }
function fail(fd: FormData, fallback: string, message: string): never { redirect(`${back(fd, fallback)}?error=${encodeURIComponent(message)}`); }
function done(fd: FormData, fallback: string, message: string): never { const target = back(fd, fallback); revalidatePath(target); redirect(`${target}?notice=${encodeURIComponent(message)}`); }

export async function inviteExistingPartner(fd: FormData) {
  const user = await requireVerifiedRole("COMPANY"); const organization = await getCompanyOrganization(user); const email = value(fd, "email").toLowerCase();
  const invited = await db.user.findUnique({ where: { email }, include: { partner: true } });
  if (!invited?.partner || !invited.emailVerifiedAt) fail(fd, "/company/network", "No verified partner account uses this email yet. Ask them to apply first.");
  await db.companyPartnerConnection.upsert({ where: { organizationId_partnerId: { organizationId: organization.id, partnerId: invited.partner.id } }, update: { status: "INVITED" }, create: { organizationId: organization.id, partnerId: invited.partner.id } });
  await audit({ action: "network.partner_invited", entityType: "Organization", entityId: organization.id, actorId: user.id, actorLabel: actorLabel(user), partnerId: invited.partner.id, meta: { email } });
  done(fd, "/company/network", "Private-network invitation created.");
}

export async function respondNetworkInvitation(fd: FormData) {
  const user = await requireVerifiedRole("PARTNER"); if (!user.partner) redirect("/login"); const decision = value(fd, "decision");
  const connection = await db.companyPartnerConnection.findFirst({ where: { id: value(fd, "connectionId"), partnerId: user.partner.id, status: "INVITED" } });
  if (!connection || !["accept", "reject"].includes(decision)) fail(fd, "/partner/network", "Invitation is no longer available.");
  await db.companyPartnerConnection.update({ where: { id: connection.id }, data: { status: decision === "accept" ? "ACTIVE" : "REJECTED", approvedAt: decision === "accept" ? new Date() : null } });
  await audit({ action: "network.invitation_responded", entityType: "CompanyPartnerConnection", entityId: connection.id, actorId: user.id, actorLabel: actorLabel(user), partnerId: user.partner.id, meta: { decision } });
  done(fd, "/partner/network", `Invitation ${decision === "accept" ? "accepted" : "rejected"}.`);
}

export async function updateNetworkConnection(fd: FormData) {
  const user = await requireVerifiedRole("COMPANY"); const organization = await getCompanyOrganization(user); const operation = value(fd, "operation");
  if (!['ACTIVE', 'PAUSED'].includes(operation)) fail(fd, "/company/network", "Invalid connection update.");
  const result = await db.companyPartnerConnection.updateMany({ where: { id: value(fd, "connectionId"), organizationId: organization.id }, data: { status: operation as "ACTIVE" | "PAUSED" } });
  if (!result.count) fail(fd, "/company/network", "Connection not found."); done(fd, "/company/network", "Network connection updated.");
}

export async function publishCapacityPulse(fd: FormData) {
  const user = await requireVerifiedRole("PARTNER"); if (!user.partner) redirect("/login"); const status = value(fd, "status") as CapacityStatus; const direction = value(fd, "direction") as Direction; const availableBand = value(fd, "availableBand"); const hours = Math.max(1, Math.min(24, Number(value(fd, "hours")) || 8));
  if (!['AVAILABLE', 'LIMITED', 'PAUSED', 'OFFLINE'].includes(status) || !['INR_TO_USDT', 'USDT_TO_INR', 'INR_PAYOUTS'].includes(direction) || !availableBand) fail(fd, "/partner/capacity", "Complete the capacity pulse.");
  await db.capacityPulse.create({ data: { partnerId: user.partner.id, status, direction, availableBand, minTicket: value(fd, "minTicket") || null, maxTicket: value(fd, "maxTicket") || null, banks: values(fd, "banks"), methods: values(fd, "methods"), availableUntil: new Date(Date.now() + hours * 60 * 60 * 1000) } });
  await audit({ action: "capacity.published", entityType: "PartnerProfile", entityId: user.partner.id, actorId: user.id, actorLabel: actorLabel(user), partnerId: user.partner.id, meta: { status, direction, hours } });
  done(fd, "/partner/capacity", "Capacity pulse is live.");
}

export async function routePrivateOffers(fd: FormData) {
  const user = await requireVerifiedRole("COMPANY"); if (!user.company) redirect("/login"); const organization = await getCompanyOrganization(user); const request = await db.liquidityRequest.findFirst({ where: { id: value(fd, "requestId"), companyId: user.company.id } });
  if (!request?.routingEnabled) fail(fd, "/company", "This request is not eligible for automatic routing.");
  const connections = await db.companyPartnerConnection.findMany({ where: { organizationId: organization.id, status: "ACTIVE" }, include: { partner: { include: { capacityPulses: { orderBy: { confirmedAt: "desc" }, take: 1 }, verificationCases: { where: { status: "APPROVED", expiresAt: { gt: new Date() } }, take: 1 }, incidents: { where: { status: { in: ["OPEN", "INVESTIGATING"] } }, select: { id: true } } } } } });
  const ranked = rankCandidates(request, connections.map(({ partner }) => ({ partnerId: partner.id, directions: partner.directions, banks: partner.banks, methods: partner.methods, tier: partner.tier, verificationApproved: partner.verificationCases.length > 0, incidentCount: partner.incidents.length, capacity: partner.capacityPulses[0] ?? null }))).slice(0, 3);
  if (!ranked.length) fail(fd, `/company/requests/${request.id}`, "No connected partner has both approved verification and live capacity.");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.$transaction(ranked.map((candidate) => db.matchOffer.upsert({ where: { requestId_partnerId: { requestId: request.id, partnerId: candidate.partnerId } }, update: { status: "PENDING", fitScore: candidate.score, reasonCodes: candidate.reasons, expiresAt, respondedAt: null }, create: { reference: createReference("OFF"), requestId: request.id, partnerId: candidate.partnerId, organizationId: organization.id, fitScore: candidate.score, reasonCodes: candidate.reasons, expiresAt } })));
  await audit({ action: "routing.private_offers_created", entityType: "LiquidityRequest", entityId: request.id, actorId: user.id, actorLabel: actorLabel(user), requestId: request.id, meta: { count: ranked.length, algorithm: "deterministic-v1" } });
  done(fd, `/company/requests/${request.id}`, `${ranked.length} controlled offer${ranked.length === 1 ? "" : "s"} sent.`);
}

export async function respondToOffer(fd: FormData) {
  const user = await requireVerifiedRole("PARTNER"); if (!user.partner) redirect("/login"); const partnerId = user.partner.id; const decision = value(fd, "decision");
  const offer = await db.matchOffer.findFirst({ where: { id: value(fd, "offerId"), partnerId, status: "PENDING" } });
  if (!offer || offer.expiresAt <= new Date() || !['accept', 'decline'].includes(decision)) fail(fd, "/partner/offers", "Offer is invalid or expired.");
  const termsSummary = value(fd, "termsSummary") || null;
  await db.$transaction(async (tx) => { await tx.matchOffer.update({ where: { id: offer.id }, data: { status: decision === "accept" ? "ACCEPTED" : "DECLINED", respondedAt: new Date(), termsSummary, capacityBand: value(fd, "capacityBand") || null } }); if (decision === "accept") await tx.match.upsert({ where: { requestId_partnerId: { requestId: offer.requestId, partnerId } }, update: { status: "SHORTLISTED", confidenceScore: offer.fitScore, adminNote: termsSummary, nextAction: "Operator review and controlled introduction" }, create: { requestId: offer.requestId, partnerId, status: "SHORTLISTED", confidenceScore: offer.fitScore, adminNote: termsSummary, nextAction: "Operator review and controlled introduction" } }); });
  await audit({ action: "offer.responded", entityType: "MatchOffer", entityId: offer.id, actorId: user.id, actorLabel: actorLabel(user), requestId: offer.requestId, partnerId, meta: { decision } });
  done(fd, "/partner/offers", `Offer ${decision === "accept" ? "accepted and sent to operations" : "declined"}.`);
}

export async function startVerification(fd: FormData) {
  const subject = value(fd, "subject"); const user = await requireVerifiedRole(subject === "organization" ? "COMPANY" : "PARTNER");
  const organization = subject === "organization" ? await getCompanyOrganization(user) : null; const partner = subject === "partner" ? user.partner : null;
  if (!organization && !partner) fail(fd, back(fd, "/"), "Verification subject not found.");
  const existing = await db.verificationCase.findFirst({ where: { ...(organization ? { organizationId: organization.id } : { partnerId: partner!.id }), status: { in: ["IN_PROGRESS", "NEEDS_REVIEW", "APPROVED"] } }, orderBy: { createdAt: "desc" } });
  if (existing) done(fd, back(fd, "/"), "Verification case is already active.");
  const types = organization ? ["KYB", "UBO", "SANCTIONS_PEP", "BANK_ACCOUNT"] : ["IDENTITY", "SANCTIONS_PEP", "BANK_ACCOUNT", "WALLET_RISK", "REFERENCES"];
  const created = await db.verificationCase.create({ data: { reference: createReference("VER"), organizationId: organization?.id, partnerId: partner?.id, checks: { create: types.map((type) => ({ type })) } } });
  await audit({ action: "verification.started", entityType: "VerificationCase", entityId: created.id, actorId: user.id, actorLabel: actorLabel(user), partnerId: partner?.id, meta: { subject } });
  done(fd, back(fd, "/"), "Verification case started.");
}

export async function reviewVerificationCheck(fd: FormData) {
  const admin = await requireRole("ADMIN"); const status = value(fd, "status") as VerificationCheckStatus;
  if (!['PASSED', 'REVIEW', 'FAILED', 'WAIVED'].includes(status)) fail(fd, "/admin/reviews", "Invalid check decision.");
  const check = await db.verificationCheck.update({ where: { id: value(fd, "checkId") }, data: { status, summary: value(fd, "summary") || null, reviewedById: admin.id, reviewedAt: new Date() } });
  await db.verificationCase.update({ where: { id: check.verificationCaseId }, data: { status: "NEEDS_REVIEW" } });
  await audit({ action: "verification.check_reviewed", entityType: "VerificationCheck", entityId: check.id, actorId: admin.id, actorLabel: "Operator", meta: { status } });
  done(fd, `/admin/reviews/${check.verificationCaseId}`, "Check decision saved.");
}

export async function runVerificationProviderCheck(fd: FormData) {
  const admin = await requireRole("ADMIN"); const check = await db.verificationCheck.findUnique({ where: { id: value(fd, "checkId") }, include: { verificationCase: { include: { organization: { include: { companyProfile: true } }, partner: true } } } });
  if (!check) fail(fd, "/admin/reviews", "Check not found.");
  const kind = check.type.includes("BANK") ? "BANK" : check.type.includes("WALLET") ? "WALLET" : check.type.includes("SANCTIONS") || check.type.includes("PEP") ? "AML" : "KYB";
  const subject = check.verificationCase.partner ?? check.verificationCase.organization?.companyProfile; if (!subject) fail(fd, "/admin/reviews", "Subject not found.");
  await db.verificationCheck.update({ where: { id: check.id }, data: { status: "RUNNING" } });
  const result = await runProviderCheck(kind, check.type, check.verificationCase.reference, JSON.parse(JSON.stringify(subject)) as Record<string, unknown>);
  await db.verificationCheck.update({ where: { id: check.id }, data: { provider: result.provider, providerReference: result.reference, status: result.status, summary: result.summary, result: JSON.parse(JSON.stringify(result.raw ?? {})) as Prisma.InputJsonValue, reviewedAt: new Date(), reviewedById: admin.id } });
  await audit({ action: "verification.provider_check", entityType: "VerificationCheck", entityId: check.id, actorId: admin.id, actorLabel: "Operator", meta: { provider: result.provider, status: result.status } });
  done(fd, `/admin/reviews/${check.verificationCaseId}`, "Provider result normalized and recorded.");
}

export async function reviewEvidence(fd: FormData) {
  const admin = await requireRole("ADMIN"); const decision = value(fd, "decision"); if (!['accept', 'reject'].includes(decision)) fail(fd, "/admin/reviews", "Invalid evidence decision.");
  const artifact = await db.evidenceArtifact.update({ where: { id: value(fd, "artifactId") }, data: { status: decision === "accept" ? "ACCEPTED" : "REJECTED", reviewedById: admin.id, reviewedAt: new Date() } });
  await audit({ action: "verification.evidence_reviewed", entityType: "EvidenceArtifact", entityId: artifact.id, actorId: admin.id, actorLabel: "Operator", meta: { decision } });
  done(fd, `/admin/reviews/${artifact.verificationCaseId}`, "Evidence decision saved.");
}

export async function decideVerification(fd: FormData) {
  const admin = await requireRole("ADMIN"); const decision = value(fd, "decision"); const item = await db.verificationCase.findUnique({ where: { id: value(fd, "caseId") }, include: { checks: true, evidence: true, partner: true } });
  if (!item || !['approve', 'reject'].includes(decision)) fail(fd, "/admin/reviews", "Case or decision is invalid.");
  if (decision === "approve" && (item.checks.some((check) => !['PASSED', 'REVIEW', 'WAIVED'].includes(check.status)) || !item.evidence.some((evidence) => evidence.status === "ACCEPTED"))) fail(fd, `/admin/reviews/${item.id}`, "Approval requires completed checks and at least one accepted evidence artifact.");
  const status = decision === "approve" ? "APPROVED" : "REJECTED"; const expiresAt = decision === "approve" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
  await db.$transaction(async (tx) => { await tx.verificationCase.update({ where: { id: item.id }, data: { status, decisionNote: value(fd, "note") || null, decidedById: admin.id, decidedAt: new Date(), expiresAt } }); if (item.partnerId) await tx.partnerProfile.update({ where: { id: item.partnerId }, data: decision === "approve" ? { status: "VERIFIED", tier: "VERIFIED", verifiedAt: new Date() } : { status: "REJECTED", tier: "RESTRICTED" } }); });
  await audit({ action: "verification.decided", entityType: "VerificationCase", entityId: item.id, actorId: admin.id, actorLabel: "Operator", partnerId: item.partnerId, meta: { decision, expiresAt } });
  done(fd, `/admin/reviews/${item.id}`, `Verification ${decision === "approve" ? "approved" : "rejected"}.`);
}

export async function createIncident(fd: FormData) {
  const admin = await requireRole("ADMIN"); const summary = value(fd, "summary"); if (!summary) fail(fd, "/admin/incidents", "Incident summary is required.");
  const incident = await db.incident.create({ data: { reference: createReference("INC"), partnerId: value(fd, "partnerId") || null, severity: value(fd, "severity") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", category: value(fd, "category") || "OPERATIONS", summary, details: value(fd, "details") || null, openedById: admin.id } });
  await audit({ action: "incident.created", entityType: "Incident", entityId: incident.id, actorId: admin.id, actorLabel: "Operator", partnerId: incident.partnerId, meta: { severity: incident.severity } }); done(fd, "/admin/incidents", "Incident opened.");
}

export async function resolveIncident(fd: FormData) {
  const admin = await requireRole("ADMIN"); const incident = await db.incident.update({ where: { id: value(fd, "incidentId") }, data: { status: "RESOLVED", resolvedById: admin.id, resolvedAt: new Date() } });
  await audit({ action: "incident.resolved", entityType: "Incident", entityId: incident.id, actorId: admin.id, actorLabel: "Operator", partnerId: incident.partnerId }); done(fd, "/admin/incidents", "Incident resolved.");
}
