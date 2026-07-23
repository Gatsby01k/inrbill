import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/secure-token";

export const PENDING_QUOTE_COOKIE = "inrp2p_pending_quote";
const PENDING_QUOTE_COOKIE_PREFIX = `${PENDING_QUOTE_COOKIE}_`;
const PENDING_QUOTE_SECONDS = 15 * 60;

function quoteCookieName(quoteId: string) {
  return `${PENDING_QUOTE_COOKIE_PREFIX}${quoteId}`;
}

export async function bindPendingQuote(quoteId: string) {
  const token = createOpaqueToken();
  const jar = await cookies();
  const cookieName = quoteCookieName(quoteId);
  for (const cookie of jar.getAll()) {
    if (
      cookie.name.startsWith(PENDING_QUOTE_COOKIE_PREFIX) &&
      cookie.name !== cookieName
    ) {
      jar.delete(cookie.name);
    }
  }
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    priority: "high",
    path: "/",
    maxAge: PENDING_QUOTE_SECONDS,
  });
  return { tokenHash: hashOpaqueToken(token), rawToken: token };
}

export async function pendingQuoteClaim(expectedQuoteId?: string) {
  const jar = await cookies();
  let quoteId = expectedQuoteId ?? "";
  let token =
    expectedQuoteId
      ? jar.get(quoteCookieName(expectedQuoteId))?.value ?? ""
      : "";

  // Temporary compatibility for quotes issued immediately before this release.
  if (!token) {
    const legacy = jar.get(PENDING_QUOTE_COOKIE)?.value ?? "";
    const separator = legacy.indexOf(".");
    if (separator > 0) {
      const legacyQuoteId = legacy.slice(0, separator);
      if (!expectedQuoteId || legacyQuoteId === expectedQuoteId) {
        quoteId = legacyQuoteId;
        token = legacy.slice(separator + 1);
      }
    }
  }
  if (!quoteId || !token) return null;
  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return null;

  const expected = Buffer.from(quote.clientTokenHash, "hex");
  const provided = Buffer.from(hashOpaqueToken(token), "hex");
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;
  return quote;
}

export async function clearPendingQuote(quoteId?: string) {
  const jar = await cookies();
  jar.delete(PENDING_QUOTE_COOKIE);
  if (quoteId) {
    jar.delete(quoteCookieName(quoteId));
    return;
  }
  for (const cookie of jar.getAll()) {
    if (cookie.name.startsWith(PENDING_QUOTE_COOKIE_PREFIX)) {
      jar.delete(cookie.name);
    }
  }
}
