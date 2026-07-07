/** Canonical site URL — set NEXT_PUBLIC_SITE_URL to your production domain. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://inrbill-six.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "INRP2P";

export const SITE_TAGLINE = "Private INR Liquidity Network";

export const SITE_DESCRIPTION =
  "INRP2P finds reviewed INR liquidity partners for companies moving serious volume: INR to USDT, USDT to INR and INR payouts. Manual KYB review, requirements-based matching, qualified introductions. No custody, no execution — coordination only.";
