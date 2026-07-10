// Referral program — the cheapest real growth lever a two-sided marketplace
// has: existing companies/partners already know who else needs this. Each
// account gets its own shareable code the moment it's created; a new
// signup that arrived via someone else's link gets referredByCode set so
// the relationship is on record from day one.
//
// Deliberately NOT auto-crediting any money. When a referred account's
// first deal closes, runReferralRewardWatchdog (src/lib/watchdogs.ts) alerts
// ops on Telegram — a human decides the actual discount/payout and applies
// it as a normal RevenueRecord adjustment, the same way every other
// financial action on this platform already requires a human in the loop.

import { db } from "@/lib/db";

/** Cookie name shared between the client-side capture component
    (src/components/site/referral-capture.tsx, writes it) and the server
    actions below (read it at signup time). */
export const REFERRAL_COOKIE = "inrp2p_ref";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — easy to read aloud or retype
const CODE_LENGTH = 7;
const MAX_ATTEMPTS = 5;

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function isUniqueConflict(err: unknown): boolean {
  return (err as { code?: string })?.code === "P2002";
}

/** Assigns a fresh, unique referral code to a just-created company. Best
    effort: on repeated collisions (astronomically unlikely at this code
    space, but handled anyway) it gives up and leaves referralCode null
    rather than blocking signup — an admin can set one by hand later if that
    ever actually happens. */
export async function assignCompanyReferralCode(companyId: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    try {
      await db.companyProfile.update({ where: { id: companyId }, data: { referralCode: code } });
      return code;
    } catch (err) {
      if (!isUniqueConflict(err)) {
        console.error("assignCompanyReferralCode failed", err);
        return null;
      }
    }
  }
  return null;
}

/** Same as assignCompanyReferralCode, for the partner side. */
export async function assignPartnerReferralCode(partnerId: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    try {
      await db.partnerProfile.update({ where: { id: partnerId }, data: { referralCode: code } });
      return code;
    } catch (err) {
      if (!isUniqueConflict(err)) {
        console.error("assignPartnerReferralCode failed", err);
        return null;
      }
    }
  }
  return null;
}

const CODE_RE = /^[A-Z0-9]{4,12}$/;

/** Validates a candidate referral code's *shape* only (cheap, no DB call) —
    used to sanity-check a cookie value before trusting it as input. Whether
    it actually belongs to a real account is checked separately, only at the
    point it's about to be stored, so a stale/bogus cookie can't pollute
    referredByCode with garbage. */
export function looksLikeReferralCode(raw: string | null | undefined): raw is string {
  return typeof raw === "string" && CODE_RE.test(raw);
}

/** Confirms a code actually belongs to a real company or partner account
    before it's persisted as someone else's referredByCode. Returns the
    normalized code if valid, or null. */
export async function resolveReferralCode(raw: string | null | undefined): Promise<string | null> {
  if (!looksLikeReferralCode(raw)) return null;
  const code = raw.toUpperCase();
  const [company, partner] = await Promise.all([
    db.companyProfile.findUnique({ where: { referralCode: code }, select: { id: true } }),
    db.partnerProfile.findUnique({ where: { referralCode: code }, select: { id: true } }),
  ]);
  return company || partner ? code : null;
}

export function referralUrl(kind: "request" | "apply", code: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const path = kind === "request" ? "/request" : "/apply";
  return `${base}${path}?ref=${encodeURIComponent(code)}`;
}

/** Human label for whoever owns a referral code — used only in the
    referral-reward watchdog alert, so ops sees "referred by X" instead of
    a bare code. Falls back to the code itself if the owner can't be found
    (shouldn't happen since resolveReferralCode already validated it, but
    an account could in theory be deleted between capture and reward). */
export async function referrerLabel(code: string | null): Promise<string> {
  if (!code) return "unknown";
  const [company, partner] = await Promise.all([
    db.companyProfile.findUnique({ where: { referralCode: code }, select: { companyName: true } }),
    db.partnerProfile.findUnique({ where: { referralCode: code }, select: { displayName: true } }),
  ]);
  return company?.companyName ?? partner?.displayName ?? code;
}

/** Everyone a given account has referred, for the workspace referral card —
    just enough to show "N referred, M have started, K have closed a deal"
    without exposing the referred account's own private details. */
export async function listReferredCompanies(code: string) {
  return db.companyProfile.findMany({
    where: { referredByCode: code },
    select: {
      id: true,
      companyName: true,
      createdAt: true,
      requests: {
        select: { matches: { select: { introductions: { select: { status: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listReferredPartners(code: string) {
  return db.partnerProfile.findMany({
    where: { referredByCode: code },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      matches: { select: { introductions: { select: { status: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
