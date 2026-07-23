import { db } from "@/lib/db";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/secure-token";
import { SITE_URL } from "@/lib/site";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Email provider rejected request (${response.status}).`);
  return true;
}

function message(title: string, body: string, cta: string, url: string) {
  return `<div style="background:#f7f5ef;padding:32px;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:560px;margin:auto;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:28px"><div style="font-size:12px;letter-spacing:.18em;color:#b7791f;font-weight:700">INRP2P</div><h1 style="font-size:22px;margin:18px 0 10px">${escapeHtml(title)}</h1><p style="font-size:14px;line-height:1.6;color:#475569">${escapeHtml(body)}</p><a href="${url}" style="display:inline-block;margin-top:18px;background:#d69a38;color:#071422;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:9px">${escapeHtml(cta)}</a><p style="font-size:11px;line-height:1.5;color:#94a3b8;margin-top:24px">If you did not request this, ignore the message. INRP2P never asks for passwords or verification codes by email.</p></div></div>`;
}

export async function issueEmailVerification(userId: string, email: string) {
  const token = createOpaqueToken();
  await db.$transaction([db.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }), db.emailVerificationToken.create({ data: { userId, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } })]);
  const url = `${SITE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail(email, "Verify your INRP2P email", message("Verify your email", "Confirm that this address belongs to you. The link expires in 24 hours and can only be used once.", "Verify email", url));
}

export async function issuePasswordReset(userId: string, email: string) {
  const token = createOpaqueToken();
  await db.$transaction([db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }), db.passwordResetToken.create({ data: { userId, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } })]);
  const url = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(email, "Reset your INRP2P password", message("Reset your password", "Use this single-use link to set a new password. It expires in 30 minutes and revokes every active session.", "Reset password", url));
}

export async function sendCustomerOtp(email: string, code: string) {
  const html = `<div style="background:#f7f3eb;padding:32px;font-family:Arial,sans-serif;color:#141414"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e7e0d5;border-radius:18px;padding:30px"><div style="font-size:12px;letter-spacing:.18em;color:#d46616;font-weight:700">INRP2P</div><h1 style="font-size:22px;margin:18px 0 8px">Confirm your move</h1><p style="font-size:14px;line-height:1.6;color:#5f5b55">Enter this single-use code to continue. It expires in 10 minutes.</p><div style="font-size:34px;letter-spacing:.24em;font-weight:700;margin:24px 0;color:#171717">${escapeHtml(code)}</div><p style="font-size:11px;line-height:1.55;color:#8d877e;margin-top:24px">Do not share this code. INRP2P will never ask for a password, wallet key, seed phrase, or banking password.</p></div></div>`;
  return sendEmail(email, `${code} is your INRP2P code`, html);
}
