"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; text: string };

type ConciergeResponse =
  | { type: "continue"; reply: string }
  | { type: "ready"; kind: "request" | "apply"; reply: string; fields: Record<string, string | string[]> };

/** Builds the same query-string shape src/lib/form-prefill.ts's
    requestFormPrefill/partnerFormPrefill expect on the other end — array
    fields become repeated params, matching URLSearchParams.getAll(). */
function ctaUrl(result: Extract<ConciergeResponse, { type: "ready" }>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(result.fields)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  const base = result.kind === "request" ? "/request" : "/apply";
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Public landing-page concierge — same floating-bubble shape as the admin
 * AI copilot (src/components/workspace/ai-copilot.tsx), but talks to
 * anonymous visitors and hands off to a pre-filled form instead of
 * answering questions from live data. See src/lib/ai-prompts.ts's
 * CONCIERGE_SYSTEM_PROMPT for the CONTINUE/READY contract this parses.
 */
export function AiConcierge() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [cta, setCta] = useState<{ label: string; url: string } | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const nextTurns: Turn[] = [...turns, { role: "user", text: trimmed }];
    setTurns(nextTurns);
    setInput("");
    setCta(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextTurns }),
      });
      const data = (await res.json()) as ConciergeResponse;
      setTurns([...nextTurns, { role: "assistant", text: data.reply }]);
      if (data.type === "ready") {
        setCta({ label: data.kind === "request" ? "Continue to request form →" : "Continue to partner application →", url: ctaUrl(data) });
      }
    } catch {
      setTurns([...nextTurns, { role: "assistant", text: "Something went wrong — please try again." }]);
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
        💬 Not sure where to start?
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[520px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.02] px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-slate-700">INRP2P concierge</p>
          <p className="text-[10px] text-slate-400">Tell me what you need — I&apos;ll get you to the right form</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 ? (
          <div className="space-y-2 p-2">
            <p className="text-xs leading-relaxed text-slate-400">
              I can point you to the right form in a couple of questions — are you a company that needs
              INR liquidity, or a partner/trader who wants to offer capacity?
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => send("I'm a company that needs INR liquidity.")}
                className="chip border-gold-500/30 bg-gold-500/10 text-gold-700 hover:bg-gold-500/20"
              >
                I need liquidity
              </button>
              <button
                onClick={() => send("I'm a partner/trader who wants to offer capacity.")}
                className="chip border-gold-500/30 bg-gold-500/10 text-gold-700 hover:bg-gold-500/20"
              >
                I&apos;m a trader/partner
              </button>
            </div>
          </div>
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
            </div>
          </div>
        ))}
        {loading ? <p className="px-1 text-xs text-slate-400">Thinking…</p> : null}
        {cta ? (
          <div className="flex justify-start">
            <Link href={cta.url} className="btn btn-gold btn-sm">
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex items-end gap-2 border-t border-black/10 p-2.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          className="input flex-1 resize-none text-xs"
          placeholder="Type a message…"
        />
        <button onClick={() => send(input)} disabled={loading} className="btn btn-gold btn-sm">
          Send
        </button>
      </div>
    </div>
  );
}
