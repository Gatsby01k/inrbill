/** Canonical site URL — set NEXT_PUBLIC_SITE_URL to your production domain. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://inrp2p.com"
).replace(/\/$/, "");

export const SITE_NAME = "INRP2P";

export const SITE_TAGLINE = "India's Liquidity, Reviewed";

export const SITE_DESCRIPTION =
  "Private INR partner network OS for verification, live capacity, explainable routing and controlled introductions. No custody or platform execution of deal funds.";

/**
 * Build/version marker shown in the operator UI so a screenshot or bug report
 * can be tied back to a specific deploy. Falls back gracefully in local dev.
 * Set NEXT_PUBLIC_APP_VERSION in CI/deploy for a human-readable release tag —
 * otherwise falls back to the platform-provided commit SHA, then "dev".
 */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  "dev";

/**
 * Public @handle of the notifications bot (no @), used only to build a
 * clickable https://t.me/<handle> link in the workspace "Connect Telegram"
 * card. Optional — the card falls back to plain-text instructions if unset.
 */
export const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
