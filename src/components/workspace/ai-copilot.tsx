"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; text: string; toolsUsed?: string[] };

/**
 * Floating AI ops copilot — natural-language questions about live platform
 * data, answered via read-only tool calls (see src/lib/ai-tools.ts). Kept
 * entirely in memory: closing the panel or reloading the page clears the
 * conversation, nothing is persisted.
 */
export function AiCopilot() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const nextTurns: Turn[] = [...turns, { role: "user", text }];
    setTurns(nextTurns);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextTurns.map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json();
      setTurns([
        ...nextTurns,
        { role: "assistant", text: data.text ?? data.error ?? "No response.", toolsUsed: data.toolsUsed },
      ]);
    } catch {
      setTurns([...nextTurns, { role: "assistant", text: "Something went wrong reaching the AI." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2.5 text-xs font-semibold text-[#231503] shadow-lg hover:brightness-105"
      >
        ✨ Ask the platform
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[520px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.02] px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-slate-700">✨ AI ops copilot</p>
          <p className="text-[10px] text-slate-400">Read-only — looks things up, never changes data</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 ? (
          <p className="p-2 text-xs leading-relaxed text-slate-400">
            Try: &quot;which requests are stuck over a week&quot;, &quot;revenue this month vs last&quot;, or
            &quot;track record for PTR-0003&quot;.
          </p>
        ) : null}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                t.role === "user"
                  ? "max-w-[85%] rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-3 py-2 text-[12.5px] leading-relaxed text-[#231503]"
                  : "max-w-[85%] rounded-lg border border-black/[0.08] bg-[#FCFAF5] px-3 py-2 text-[12.5px] leading-relaxed text-slate-700"
              }
            >
              <p className="whitespace-pre-wrap">{t.text}</p>
              {t.toolsUsed && t.toolsUsed.length ? (
                <p className="mt-1.5 text-[10px] text-slate-400">used: {t.toolsUsed.join(", ")}</p>
              ) : null}
            </div>
          </div>
        ))}
        {loading ? <p className="px-1 text-xs text-slate-400">Thinking…</p> : null}
      </div>

      <div className="flex items-end gap-2 border-t border-black/10 p-2.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          className="input flex-1 resize-none text-xs"
          placeholder="Ask about requests, partners, revenue…"
        />
        <button onClick={send} disabled={loading} className="btn btn-gold btn-sm">
          Ask
        </button>
      </div>
    </div>
  );
}
