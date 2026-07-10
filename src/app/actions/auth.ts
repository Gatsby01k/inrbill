"use server";

import { redirect } from "next/navigation";
import {
  bumpTwoFactorAttempts,
  clearFailedLogins,
  clearTwoFactorChallenge,
  createSession,
  createTwoFactorChallenge,
  destroySession,
  getTwoFactorChallenge,
  isAccountLocked,
  registerFailedLogin,
  roleHome,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { loginSchema, twoFactorCodeSchema, type ActionState } from "@/lib/schemas";
import { matchBackupCode, verifyTotp } from "@/lib/totp";

function safeNext(next: FormDataEntryValue | null): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Checked before the password compare so a locked account never leaks
  // "yes, that password was actually wrong" while it's locked.
  if (user && isAccountLocked(user)) {
    const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60_000));
    return { error: `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    if (user) await registerFailedLogin(user.id);
    return { error: "Invalid email or password." };
  }

  await clearFailedLogins(user.id);
  const next = safeNext(formData.get("next"));

  // Password is correct — for accounts with 2FA enabled, that's only step
  // one. Park them in a short-lived challenge instead of a real session
  // until they prove they hold the authenticator/backup code too.
  if (user.totpEnabled) {
    await createTwoFactorChallenge(user.id, next ?? undefined);
    redirect(next ? `/login/verify?next=${encodeURIComponent(next)}` : "/login/verify");
  }

  await createSession(user.id);
  redirect(next ?? roleHome(user.role));
}

export async function verifyTwoFactor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const challenge = await getTwoFactorChallenge();
  if (!challenge) {
    return { error: "That verification step expired. Sign in again." };
  }

  const parsed = twoFactorCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { error: "Enter the 6-digit code or a backup code." };
  const submitted = parsed.data;

  const user = await db.user.findUnique({ where: { id: challenge.userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    await clearTwoFactorChallenge();
    return { error: "Two-factor is no longer enabled on this account. Sign in again." };
  }

  const isTotpMatch = /^\d{6}$/.test(submitted) && verifyTotp(user.totpSecret, submitted);

  let usedBackupHash: string | null = null;
  if (!isTotpMatch) {
    usedBackupHash = await matchBackupCode(submitted, user.totpBackupCodes);
  }

  if (!isTotpMatch && !usedBackupHash) {
    await bumpTwoFactorAttempts(challenge.token);
    return { error: "Incorrect code. Check your authenticator app and try again." };
  }

  if (usedBackupHash) {
    // Single-use — burn it the moment it's redeemed.
    await db.user.update({
      where: { id: user.id },
      data: { totpBackupCodes: { set: user.totpBackupCodes.filter((h) => h !== usedBackupHash) } },
    });
  }

  await createSession(user.id);
  await clearTwoFactorChallenge();
  redirect(challenge.next ?? roleHome(user.role));
}

export async function cancelTwoFactorChallenge() {
  await clearTwoFactorChallenge();
  redirect("/login");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
