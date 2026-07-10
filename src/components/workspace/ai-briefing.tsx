"use client";

import { useState } from "react";

type Props = {
  requestId: string;
  /** Pre-filled from LiquidityRequest.aiTriageNote/aiFlagged — the automatic
      background pipeline (src/lib/ai-triage.ts) already ran this the moment
      the request was submitted, so most of the time there's nothing to wait
      on here. Null only if AI wasn't configured yet when the request came
      in, or the request predates this feature. */
  initialNote: string | null;
  initialFlagged: boolean | null;
};

/** AI summary of a request's free-text fields, for the admin request detail
    page. Shows the auto-generated verdict on load; "Regenerate" re-runs the
    same prompt on demand and persists the refreshed result. Degrades to a
    setup hint if the ANTHROPIC_API_KEY isn't configured. */
export function AiBriefingCard({ requestId, initialNote, initialFlagged }: Props) {
  const [text, setText] = useState<string | null>(initialNote);
  const [flagged, setFlagged] = useState<boolean | null>(initialFlagged);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.text) {
        setText(data.text);
        setFlagged(Boolean(data.flagged));
      } else {
        setError(data.error ?? "AI call failed.");
      }
    } catch {
      setError("AI call failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">✨ AI briefing</p>
          {text && flagged !== null ? (
            <span
              className={
                flagged
                  ? "rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600"
                  : "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"
              }
            >
              {flagged ? "Flagged" : "Clear"}
            </span>
          ) : null}
        </div>
        <button onClick={generate} disabled={loading} className="btn btn-ghost btn-sm">
          {loading ? "Thinking…" : text ? "Regenerate" : "Generate"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {text ? (
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{text}</p>
      ) : !error ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
          Summarizes the free-text fields (compliance notes, partner requirements, company notes) and flags
          anything worth a second look — reads what the scoring engine doesn&apos;t. Runs automatically on
          submission; click Generate if this request predates that or AI wasn&apos;t configured yet.
        </p>
      ) : null}
    </div>
  );
}
