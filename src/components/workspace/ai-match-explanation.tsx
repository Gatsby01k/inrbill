"use client";

import { useState } from "react";

/** Admin-only "explain this match in plain English" trigger — generates
    once, persists to Match.aiExplanation, then the same text shows on the
    company's side too. Renders the existing explanation immediately if one
    is already saved. */
export function AiMatchExplanation({
  matchId,
  initialExplanation,
}: {
  matchId: string;
  initialExplanation: string | null;
}) {
  const [text, setText] = useState<string | null>(initialExplanation);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/explain-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
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
    <div className="mt-2.5">
      {text ? (
        <p className="rounded-lg border border-gold-500/20 bg-gold-500/[0.05] px-3 py-2 text-xs leading-relaxed text-slate-600">
          ✨ {text}
        </p>
      ) : null}
      {error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}
      <button onClick={generate} disabled={loading} className="btn btn-ghost btn-sm mt-1.5">
        {loading ? "Thinking…" : text ? "Regenerate explanation" : "✨ Explain in plain English"}
      </button>
    </div>
  );
}
