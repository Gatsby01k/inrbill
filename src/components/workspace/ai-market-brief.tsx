"use client";

import { useEffect, useState } from "react";

/** Platform-wide AI corridor brief for the analytics page. Unlike
    AiBriefingCard/AiPartnerBriefingCard, this isn't tied to one row in the
    database — there's nothing to pre-fill from a page-load query, so it
    fetches on mount instead (transparently served from the route's own
    Redis cache most of the time, so this is normally instant). "Regenerate"
    forces a fresh LLM call and re-caches. */
export function AiMarketBrief() {
  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(force: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/market-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.text) {
        setText(data.text);
        setGeneratedAt(data.generatedAt ?? null);
      } else {
        setError(data.error ?? "AI call failed.");
      }
    } catch {
      setError("AI call failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // Only on mount — refreshing is an explicit user action from here on.
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ✨ AI market brief
        </p>
        <button onClick={() => load(true)} disabled={loading} className="btn btn-ghost btn-sm">
          {loading ? "Thinking…" : "Regenerate"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {text ? (
        <>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{text}</p>
          {generatedAt ? (
            <p className="mt-2 text-[10.5px] text-slate-400">
              Generated {new Date(generatedAt).toLocaleString()} — cached up to 6h between regenerations.
            </p>
          ) : null}
        </>
      ) : !error && !loading ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
          Reads 14-day request growth and active partner coverage per corridor to flag where demand may be
          outrunning supply.
        </p>
      ) : null}
    </div>
  );
}
