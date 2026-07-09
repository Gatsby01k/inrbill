"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyTotp,
} from "@/lib/totp";

const SECURITY_PATH = "/admin/security";

// One-time-reveal cookie: holds freshly generated backup codes in plaintext
// just long enough for the admin to see and copy them once. The DB only ever
// stores the bcrypt hashes — this cookie is the only place the plaintext
// exists after generation, and it's deleted the moment the admin
// acknowledges saving them (or expires on its own after 5 minutes).
const REVEAL_COOKIE = "inrp2p_2fa_reveal";
const REVEAL_MAX_AGE_SECONDS = 5 * 60;

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(msg: string): never {
  redirect(`${SECURITY_PATH}?error=${encodeURIComponent(msg)}`);
}

async function setReveal(codes: string[]) {
  const jar = await cookies();
  jar.set(REVEAL_COOKIE, JSON.stringify(codes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: SECURITY_PATH,
    maxAge: REVEAL_MAX_AGE_SECONDS,
  });
}

/** Reads (without clearing) the one-time backup-code reveal, for the security page to render. */
export async function readBackupCodesReveal(): Promise<string[] | null> {
  const jar = await cookies();
  const raw = jar.get(REVEAL_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function dismissBackupCodesReveal() {
  await requireRole("ADMIN");
  const jar = await cookies();
  jar.delete(REVEAL_COOKIE);
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}

/** Step 1: generate a secret and start enrollment. Stays disabled until confirmTotpEnrollment succeeds. */
export async function startTotpEnrollment() {
  const user = await requireRole("ADMIN");
  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false, totpBackupCodes: { set: [] } },
  });
  await audit({
    action: "admin.2fa.enroll_started",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    actorLabel: "Operator",
  });
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}

/** Abort a not-yet-confirmed enrollment (secret written but never proven). */
export async function cancelTotpEnrollment() {
  const user = await requireRole("ADMIN");
  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (fresh?.totpEnabled) fail("Two-factor is already active — disable it instead of cancelling.");
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabled: false, totpBackupCodes: { set: [] } },
  });
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}

/** Step 2: prove the admin can generate a real code, then flip totpEnabled on and issue backup codes. */
export async function confirmTotpEnrollment(fd: FormData) {
  const user = await requireRole("ADMIN");
  const code = s(fd, "code");

  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh?.totpSecret) fail("Start enrollment first.");

  if (!/^\d{6}$/.test(code) || !verifyTotp(fresh.totpSecret, code)) {
    fail("That code didn't match. Check the time on your phone and try again.");
  }

  const plainCodes = generateBackupCodes();
  const hashed = await Promise.all(plainCodes.map(hashBackupCode));

  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpBackupCodes: { set: hashed } },
  });
  await setReveal(plainCodes);
  await audit({
    action: "admin.2fa.enabled",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    actorLabel: "Operator",
  });
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}

/** Re-auth with password required — 2FA is what stands between a stolen session and the admin panel. */
export async function disableTwoFactor(fd: FormData) {
  const user = await requireRole("ADMIN");
  const password = s(fd, "password");
  if (!password || !(await verifyPassword(password, user.passwordHash))) {
    fail("Incorrect password.");
  }
  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpBackupCodes: { set: [] } },
  });
  await audit({
    action: "admin.2fa.disabled",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    actorLabel: "Operator",
  });
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}

export async function regenerateBackupCodes(fd: FormData) {
  const user = await requireRole("ADMIN");
  const password = s(fd, "password");
  if (!password || !(await verifyPassword(password, user.passwordHash))) {
    fail("Incorrect password.");
  }
  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh?.totpEnabled) fail("Two-factor isn't enabled.");

  const plainCodes = generateBackupCodes();
  const hashed = await Promise.all(plainCodes.map(hashBackupCode));
  await db.user.update({ where: { id: user.id }, data: { totpBackupCodes: { set: hashed } } });
  await setReveal(plainCodes);
  await audit({
    action: "admin.2fa.backup_codes_regenerated",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    actorLabel: "Operator",
  });
  revalidatePath(SECURITY_PATH);
  redirect(SECURITY_PATH);
}
