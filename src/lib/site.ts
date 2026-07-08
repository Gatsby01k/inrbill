/** Canonical site URL — set NEXT_PUBLIC_SITE_URL to your production domain. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://inrbill-six.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "INRP2P";

export const SITE_TAGLINE = "Private INR Liquidity Network";

export const SITE_DESCRIPTION =
  "INRP2P finds reviewed INR liquidity partners for companies moving serious volume: INR to USDT, USDT to INR and INR payouts. Manual KYB review, requirements-based matching, qualified introductions. No custody, no execution — coordination only.";

/**
 * Google Analytics 4 measurement ID. Left unset by default — set
 * NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel's Production environment only, so
 * local dev and preview deploys don't pollute production analytics.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

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
