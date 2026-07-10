"use client";

import { useRef } from "react";

/**
 * Wraps a card in a cursor-following radial glow (the ".spotlight" class in
 * globals.css) — a common premium-SaaS hover detail (Linear/Stripe-style).
 * Pure CSS custom-property tracking, no state, no re-renders: onMouseMove
 * writes --mx/--my directly onto the DOM node. Degrades invisibly on touch
 * devices (no mousemove, glow just never appears — nothing breaks).
 *
 * Usage: replace `<Reveal className="card ..."` with
 * `<Reveal><SpotlightCard className="card ...">` — Reveal keeps handling
 * the scroll-in fade, SpotlightCard adds the hover glow on top of whatever
 * classes it's given (typically the existing `.card` treatment).
 */
export function SpotlightCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMouseMove} className={`spotlight ${className ?? ""}`}>
      {children}
    </div>
  );
}
