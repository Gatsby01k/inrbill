import { NextResponse } from "next/server";
import { getSession, hasWorkspaceAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { presignEvidenceDownload, presignEvidenceView } from "@/lib/s3-presign";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); if (!hasWorkspaceAccess(session.user)) return NextResponse.json({ error: "Email verification required" }, { status: 403 });
  const { id } = await params; const artifact = await db.evidenceArtifact.findUnique({ where: { id }, include: { verificationCase: { include: { organization: true } } } }); if (!artifact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = session.user.role === "ADMIN" || artifact.verificationCase.partnerId === session.user.partner?.id || artifact.verificationCase.organization?.companyProfileId === session.user.company?.id; if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const extensions: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
  try {
    const fileName = `${artifact.title}.${extensions[artifact.mimeType] ?? "bin"}`;
    const download = new URL(req.url).searchParams.get("download") === "1";
    const location = download
      ? presignEvidenceDownload(artifact.storageKey, fileName, artifact.mimeType)
      : presignEvidenceView(artifact.storageKey, fileName, artifact.mimeType);
    const response = NextResponse.redirect(location);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Vault unavailable" }, { status: 503 }); }
}
