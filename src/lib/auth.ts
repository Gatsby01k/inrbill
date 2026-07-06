import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "inrp2p_session";
const SESSION_DAYS = 30;

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  jar.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { company: true, partner: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export function roleHome(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "COMPANY" ? "/company" : "/partner";
}

/** Server-side guard. Redirects instead of throwing — safe in pages and actions. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== role) redirect(roleHome(session.user.role));
  return session.user;
}

export function actorLabel(user: SessionUser) {
  if (user.role === "ADMIN") return "Operator";
  return user.company?.companyName ?? user.partner?.displayName ?? user.name;
}
