import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashOpaqueToken } from "@/lib/secure-token";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const record = token ? await db.emailVerificationToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt <= new Date()) return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  const verified = await db.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    return true;
  });
  if (!verified) return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  await createSession(record.userId);
  return NextResponse.redirect(new URL("/account/security?verified=1", req.url));
}
