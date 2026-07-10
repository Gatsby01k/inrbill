"use client";

import { useState } from "react";

/** On-demand AI summary of a request's free-text fields, for the admin
    request detail page. Generated live on click — nothing persisted, so it
    always reflects the latest notes. Degrades to a setup hint if the
    ANTHROPIC_API_KEY isn't configured. */
export function AiBriefingCard({ requestId }: { requestId: string }) {
  const [text, setText] = useState<string | null>(null);
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">✨ AI briefing</p>
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
          anything worth a second look — reads what the scoring engine doesn&apos;t.
        </p>
      ) : null}
    </div>
  );
}
