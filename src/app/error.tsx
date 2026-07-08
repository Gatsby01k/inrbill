"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Safe logging only — no request bodies, credentials or PII, just enough
    // to correlate with server logs via the Next.js error digest.
    console.error("[INRP2P] Unhandled route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <BrandLockup />
      <div className="card max-w-sm p-7 text-center">
        <p className="font-mono text-xs text-rose-400">Error</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-50">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          Nothing was lost — the page hit an unexpected error. Try again, or head back and
          pick up where you left off.
          {error.digest ? (
            <span className="mt-2 block font-mono text-[11px] text-slate-400">
              Reference: {error.digest}
            </span>
          ) : null}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={() => reset()} className="btn btn-gold btn-sm">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            Back to INRP2P
          </Link>
        </div>
      </div>
    </div>
  );
}
