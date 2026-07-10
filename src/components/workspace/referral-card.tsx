"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/format";

export type ReferredAccountRow = {
  id: string;
  label: string;
  createdAt: string; // ISO — passed as a string since this is a client component
  dealClosed: boolean;
};

/**
 * Shareable-link card for a company/partner workspace. Copy-to-clipboard
 * pattern lifted from src/components/site/embed-badge-section.tsx's
 * CopyBlock. No reward amount or balance is shown here on purpose — see
 * src/lib/referral.ts's top comment: rewards are a manual, human-applied
 * RevenueRecord adjustment, never an automatic credit, so this card only
 * ever shows facts (link, who signed up, whether they've closed a deal),
 * not a running total that could imply money is already owed or paid.
 */
export function ReferralCard({
  url,
  code,
  referred,
}: {
  url: string;
  code: string;
  referred: ReferredAccountRow[];
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — the link is still fully visible/selectable.
    }
  }

  const closedCount = referred.filter((r) => r.dealClosed).length;

  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Refer someone
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
        Share your link. Anyone who signs up through it is on record as your referral from day
        one — when their first deal closes, we reach out about a reward.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-gold-500/25 bg-gold-500/[0.06] px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-gold-800">{url}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-[11px] font-medium text-gold-700 transition-colors hover:underline"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Your code: {code}</p>

      {referred.length > 0 ? (
        <div className="mt-4 border-t border-black/[0.06] pt-3">
          <p className="text-[11px] font-medium text-slate-500">
            {referred.length} referred{closedCount > 0 ? ` · ${closedCount} closed a deal` : ""}
          </p>
          <ul className="mt-2 space-y-1.5">
            {referred.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-slate-600">{r.label}</span>
                <span className="shrink-0 text-slate-400">
                  {r.dealClosed ? (
                    <span className="text-emerald-600">Deal closed</span>
                  ) : (
                    fmtDate(new Date(r.createdAt))
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
