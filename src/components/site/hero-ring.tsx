"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative hero ring — subtly tilts/parallaxes toward the cursor and
 * drifts on its own when the pointer is idle. Purely decorative
 * (aria-hidden), degrades to a static ring if JS/reduced-motion.
 */
export function HeroRing() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    function onMove(e: MouseEvent) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetX = (e.clientX / w - 0.5) * 2;
      targetY = (e.clientY / h - 0.5) * 2;
    }

    function tick() {
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      if (el) {
        el.style.transform = `translate3d(${curX * -14}px, ${curY * -10}px, 0) rotate(${curX * 1.5}deg)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className="pointer-events-none absolute -right-40 -top-32 -z-[1] hidden lg:block"
      width="620"
      height="620"
      viewBox="0 0 620 620"
      fill="none"
      aria-hidden
      style={{ willChange: "transform" }}
    >
      <circle
        cx="310"
        cy="310"
        r="290"
        stroke="rgba(255,153,51,0.18)"
        strokeWidth="1.5"
        strokeDasharray="4 10"
        className="animate-march-ants"
      />
      <circle cx="310" cy="310" r="214" stroke="rgba(255,153,51,0.11)" strokeWidth="1.5" />
      <circle cx="310" cy="20" r="7" fill="rgba(255,153,51,0.4)" className="animate-float" />
      <circle
        cx="59"
        cy="455"
        r="7"
        fill="rgba(23,138,56,0.3)"
        className="animate-float"
        style={{ animationDelay: "-2s" }}
      />
      <circle
        cx="561"
        cy="455"
        r="7"
        fill="rgba(255,153,51,0.28)"
        className="animate-float"
        style={{ animationDelay: "-4s" }}
      />
    </svg>
  );
}
