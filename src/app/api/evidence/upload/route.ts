import { NextResponse } from "next/server";
import type { EvidenceKind } from "@prisma/client";
import { getSession, hasWorkspaceAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { presignEvidenceUpload } from "@/lib/s3-presign";
import { createOpaqueToken } from "@/lib/secure-token";

const DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const KINDS = new Set(["INCORPORATION", "GST_CERTIFICATE", "PAN", "DIRECTOR_ID", "IDENTITY_DOCUMENT", "ADDRESS", "BANK_PROOF", "AML_POLICY", "SOURCE_OF_FUNDS", "REFERENCE", "WALLET_REPORT", "VIDEO_VERIFICATION", "AGREEMENT", "OTHER"]);
const DOCUMENT_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

async function ownedCase(caseId: string) {
  const session = await getSession(); if (!session || !hasWorkspaceAccess(session.user)) return null;
  const item = await db.verificationCase.findUnique({ where: { id: caseId }, include: { organization: true } }); if (!item) return null;
  const allowed = session.user.role === "ADMIN" || item.partnerId === session.user.partner?.id || item.organization?.companyProfileId === session.user.company?.id;
  return allowed ? { session, item } : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { caseId?: string; title?: string; kind?: string; contentType?: string; byteSize?: number } | null;
  if (!body?.caseId || !body.title || !body.kind || !KINDS.has(body.kind) || !body.contentType || !Number.isInteger(body.byteSize) || body.byteSize! <= 0) return NextResponse.json({ error: "Invalid evidence upload." }, { status: 400 });
  const byteSize = body.byteSize!;
  const isVideo = VIDEO_MIME_TYPES.has(body.contentType);
  const isDocument = DOCUMENT_MIME_TYPES.has(body.contentType);
  if ((!isDocument && !isVideo) || (body.kind === "VIDEO_VERIFICATION") !== isVideo) return NextResponse.json({ error: "Documents must be PDF, JPEG or PNG. Verification videos must be MP4, MOV or WebM." }, { status: 400 });
  if (byteSize > (isVideo ? VIDEO_LIMIT : DOCUMENT_LIMIT)) return NextResponse.json({ error: isVideo ? "Verification video must be 50 MB or smaller." : "Document must be 10 MB or smaller." }, { status: 400 });
  const access = await ownedCase(body.caseId); if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!['IN_PROGRESS', 'NEEDS_REVIEW'].includes(access.item.status)) return NextResponse.json({ error: "This verification case no longer accepts evidence." }, { status: 409 });
  try { const key = `verification/${body.caseId}/${createOpaqueToken(20)}`; const upload = presignEvidenceUpload(key, body.contentType); const artifact = await db.evidenceArtifact.create({ data: { verificationCaseId: body.caseId, kind: body.kind as EvidenceKind, title: body.title.slice(0, 120), storageKey: key, mimeType: body.contentType, byteSize, uploadedById: access.session.user.id } }); return NextResponse.json({ artifactId: artifact.id, uploadUrl: upload.url, headers: upload.headers }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Vault unavailable" }, { status: 503 }); }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null) as { artifactId?: string; checksumSha256?: string } | null;
  if (!body?.artifactId || !body.checksumSha256 || !/^[a-f0-9]{64}$/i.test(body.checksumSha256)) return NextResponse.json({ error: "Invalid confirmation." }, { status: 400 });
  const artifact = await db.evidenceArtifact.findUnique({ where: { id: body.artifactId } }); if (!artifact || !(await ownedCase(artifact.verificationCaseId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.evidenceArtifact.update({ where: { id: artifact.id }, data: { checksumSha256: body.checksumSha256.toLowerCase() } }); return NextResponse.json({ ok: true });
}
