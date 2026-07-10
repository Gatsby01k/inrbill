"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE } from "@/lib/referral";

const MAX_AGE_DAYS = 30;

/** Silent, invisible — reads ?ref=CODE from the URL on any page and stashes
    it in a cookie so a later signup (which might happen on a totally
    different page than the one the visitor first landed on) can still
    credit the referral. Mounted once in the root layout (src/app/layout.tsx)
    so it runs everywhere, not just on /request or /apply. A fresh ?ref=
    always overwrites whatever was captured before — the most recent link
    someone actually clicked is the more meaningful signal. Server-side
    reading happens in src/app/actions/public.ts via next/headers cookies(). */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (!code) return;
      const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; samesite=lax`;
    } catch {
      // Cookies unavailable (privacy mode, etc.) — referral just isn't tracked this visit.
    }
  }, []);

  return null;
}
