"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const PIPELINE = [
  { step: "Submitted", time: "09:14", text: "Requirement enters the queue with a reference number." },
  { step: "Reviewed", time: "11:02", text: "A person checks the request and your KYB position." },
  { step: "Matched", time: "11:47", text: "Verified partners shortlisted against direction, volume, banks and speed." },
  { step: "Introduced", time: "—", text: "You are introduced directly. Terms are agreed between you and the partner." },
] as const;

// Gap between log lines on the one-shot playthrough.
const STEP_DELAY_MS = 550;

/**
 * Hero pipeline card, styled as a reviewed-request audit log rather than a
 * generic onboarding stepper. The brand's actual differentiator is that
 * every step is recorded — so the card should look like a record someone
 * would actually keep, not a demo-ware progress widget. Plays through once
 * when it scrolls into view, then holds still. No infinite auto-advancing
 * carousel, no cursor-tilt, no pulsing status chip — those read as generic
 * "AI landing page" tells rather than as evidence the process is real.
 */
export function RequestPipelineCard() {
  const [revealed, setRevealed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRevealed(PIPELINE.length);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            io.unobserve(entry.target);
            PIPELINE.forEach((_, i) => {
              timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), i * STEP_DELAY_MS));
            });
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div ref={ref} className="card relative overflow-hidden border-white/10 bg-[#0b1220] shadow-raised">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(255,153,51,0.16), transparent 70%)" }}
      />

      <div className="relative flex items-center justify-between gap-2.5 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={18} />
          <p className="font-mono text-[11px] tracking-wide text-white/50">REQ-4471 · audit trail</p>
        </div>
        <span className="font-mono text-[10.5px] text-white/30">INR → USDT</span>
      </div>

      <div className="relative p-5">
        {PIPELINE.map((p, i) => {
          const shown = i < revealed;
          const isCurrent = i === revealed - 1;
          return (
            <div
              key={p.step}
              className={cn(
                "flex gap-3 py-2 transition-all duration-500",
                shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              <span className="w-11 shrink-0 pt-[2px] font-mono text-[10.5px] tabular-nums text-white/30">
                {p.time}
              </span>
              <span
                className={cn(
                  "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300",
                  shown && !isCurrent && "bg-leaf-400",
                  shown && isCurrent && "bg-gold-400",
                  !shown && "bg-white/15",
                )}
              />
              <div className="flex-1">
                <p className={cn("text-[12.5px] font-semibold", shown ? "text-white" : "text-white/35")}>
                  {p.step}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/40">{p.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative flex items-center gap-2.5 border-t border-white/10 bg-white/[0.02] px-5 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf-400" />
        <p className="text-[12px] leading-relaxed text-white/50">
          Settlement happens directly between you and the partner.
        </p>
      </div>
    </div>
  );
}
