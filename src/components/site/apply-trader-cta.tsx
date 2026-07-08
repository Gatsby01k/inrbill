"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/format";

const TOOLTIP_TEXT =
  "Looking for active INR P2P / USDT traders, payout operators and teams. Reviewed traders can become INRP2P partners after approval.";

/** Primary "apply" CTA + a small info popover explaining who it's for.
    Hover/focus reveals it on desktop (pure CSS, no JS needed); the
    info dot is the tap target on touch devices, since tapping the
    button itself should navigate, not intercept the first tap. */
export function ApplyTraderCta({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn("group/cta relative inline-flex items-center gap-1.5", className)}
    >
      <Link
        href="/apply"
        className="btn btn-ghost px-5 py-3"
        aria-describedby={tooltipId}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        Apply for Trader Review
      </Link>

      <button
        type="button"
        aria-label="Who is trader review for?"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors duration-150",
          open
            ? "border-gold-600/60 bg-gold-500/[0.12] text-gold-700"
            : "border-black/[0.14] bg-white text-slate-400 hover:border-gold-500/50 hover:text-gold-700",
        )}
      >
        i
      </button>

      <div
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-[16rem] -translate-x-1/2 rounded-xl border border-gold-500/25 bg-white/95 p-4 text-left shadow-[0_1px_2px_rgba(35,28,12,0.07),0_24px_48px_-18px_rgba(193,95,10,0.4)] backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "before:absolute before:-top-[7px] before:left-1/2 before:h-3.5 before:w-3.5 before:-translate-x-1/2 before:rotate-45 before:rounded-[3px] before:border-l before:border-t before:border-gold-500/25 before:bg-white",
          "group-hover/cta:pointer-events-auto group-hover/cta:translate-y-0 group-hover/cta:opacity-100",
          "group-focus-within/cta:pointer-events-auto group-focus-within/cta:translate-y-0 group-focus-within/cta:opacity-100",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
        )}
      >
        <span className="mb-1.5 flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-gold-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-700">
            Who this is for
          </span>
        </span>
        <p className="text-[12px] leading-relaxed text-slate-600">{TOOLTIP_TEXT}</p>
      </div>
    </div>
  );
}
