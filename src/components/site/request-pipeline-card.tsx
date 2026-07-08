"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const PIPELINE = [
  { step: "Submitted", text: "Your requirement enters the queue with a reference number." },
  { step: "In review", text: "A person reviews the request and your KYB position." },
  { step: "Matching", text: "Verified partners are shortlisted against direction, volume, banks and speed." },
  { step: "Introduced", text: "You are introduced directly. Terms are agreed between you and the partner." },
] as const;

const CYCLE_MS = 2800;

/** Hero pipeline card. Auto-plays through the four stages so the process
    reads as something that actually runs, not just marketing copy — hover
    or click a step to take the wheel yourself. Tilts gently toward the
    cursor for depth; both effects switch off under reduced-motion. */
export function RequestPipelineCard() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, lift: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reduceMotionRef.current) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % PIPELINE.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotionRef.current) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -6, y: px * 8, lift: true });
  }
  function handleEnter() {
    setPaused(true);
  }
  function handleLeave() {
    setPaused(false);
    setTilt({ x: 0, y: 0, lift: false });
  }

  const isFinal = active === PIPELINE.length - 1;

  return (
    <div style={{ perspective: "1400px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(${tilt.lift ? -4 : 0}px)`,
          transformStyle: "preserve-3d",
        }}
        className="card relative overflow-hidden shadow-raised will-change-transform"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1 opacity-70 blur-2xl transition-colors duration-700"
          style={{
            background: isFinal
              ? "radial-gradient(60% 60% at 50% 0%, rgba(23,138,56,0.16), transparent 70%)"
              : "radial-gradient(60% 60% at 50% 0%, rgba(255,153,51,0.16), transparent 70%)",
          }}
        />

        <div className="relative flex items-center justify-between gap-2.5 border-b border-black/[0.07] bg-black/[0.02] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <BrandMark size={18} />
            <p className="text-[13px] font-semibold text-slate-800">How your request moves</p>
          </div>
          <span
            className={cn(
              "chip transition-colors duration-500",
              isFinal
                ? "border-leaf-400/40 bg-leaf-50 text-leaf-700"
                : "border-gold-500/35 bg-gold-500/[0.09] text-gold-700",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isFinal ? "bg-leaf-500" : "animate-pulse bg-gold-500")} />
            {PIPELINE[active].step}
          </span>
        </div>

        <div className="relative p-5">
          <ol>
            {PIPELINE.map((p, i) => {
              const state = i < active ? "done" : i === active ? "active" : "pending";
              return (
                <li key={p.step}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(i);
                      setPaused(true);
                    }}
                    className="-m-1.5 flex w-full gap-4 rounded-lg p-1.5 text-left transition-colors hover:bg-black/[0.025]"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        style={
                          state === "active" ? { transform: "translateZ(16px) scale(1.12)" } : undefined
                        }
                        className={cn(
                          "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition-all duration-300",
                          state === "active" &&
                            "border-gold-600 bg-gradient-to-b from-gold-400 to-gold-600 text-[#231503] shadow-[0_0_0_4px_rgba(255,153,51,0.18)]",
                          state === "done" && "border-leaf-500/60 bg-leaf-500 text-white",
                          state === "pending" && "border-black/[0.12] bg-white text-slate-400",
                        )}
                      >
                        {state === "done" ? "✓" : i + 1}
                      </span>
                      {i < PIPELINE.length - 1 ? (
                        <span className="relative my-1 w-px flex-1 bg-black/[0.09]">
                          <span
                            className="absolute inset-x-0 top-0 w-px bg-gradient-to-b from-gold-500 to-leaf-500 transition-all duration-500 ease-out"
                            style={{ height: i < active ? "100%" : "0%" }}
                          />
                        </span>
                      ) : null}
                    </div>
                    <div className={i < PIPELINE.length - 1 ? "pb-5" : ""}>
                      <p
                        className={cn(
                          "text-[13px] font-semibold transition-colors duration-300",
                          state === "pending" ? "text-slate-400" : "text-slate-900",
                        )}
                      >
                        {p.step}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[12.5px] leading-relaxed transition-colors duration-300",
                          state === "pending" ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        {p.text}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-1 text-[10.5px] text-slate-400">Auto-playing — click a step to explore</p>
        </div>

        <div className="relative flex items-center gap-2.5 border-t border-leaf-500/25 bg-leaf-500/[0.06] px-5 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
          <p className="text-[12px] leading-relaxed text-leaf-800">
            Settlement happens directly between you and the partner.
          </p>
        </div>
      </div>
    </div>
  );
}
