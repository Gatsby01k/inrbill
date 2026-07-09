"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/* ── Reveal ────────────────────────────────────────────────────
   Fades + rises an element in the moment it enters the viewport.
   Pass `index` to stagger a group (each step adds 80ms delay via
   the --reveal-i custom property consumed in globals.css).       */

export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
  threshold = 0.15,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  /** Only the tags this component is actually used with — kept narrow so
      TS doesn't have to resolve the full JSX.IntrinsicElements union. */
  as?: "div" | "details";
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement & HTMLDetailsElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const revealProps = {
    ref,
    "data-reveal": inView ? ("in" as const) : undefined,
    style: { "--reveal-i": index } as React.CSSProperties,
    className: cn(!inView && "opacity-0", className),
  };

  if (as === "details") {
    return <details {...revealProps}>{children}</details>;
  }
  return <div {...revealProps}>{children}</div>;
}

/* ── Counter ───────────────────────────────────────────────────
   Animated count-up for integer stats. Renders the final value
   immediately for crawlers/no-JS, then animates client-side.    */

export function Counter({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            io.unobserve(entry.target);
            const from = 0;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              setDisplay(Math.round(from + (value - from) * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            setDisplay(0);
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {display.toLocaleString("en-IN")}
    </span>
  );
}

/* ── SlidingIndicator ──────────────────────────────────────────
   Tracks an "active" element inside a relatively-positioned
   container and animates a highlight pill to its position.
   Works for both vertical (sidebar) and horizontal (tab) layouts —
   pass `axis` to pick which dimensions to read.                  */

export function SlidingIndicator({
  containerRef,
  activeSelector,
  axis = "both",
  className,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  /** Re-measures whenever this value changes (e.g. the active pathname). */
  activeSelector: string;
  axis?: "vertical" | "horizontal" | "both";
  className?: string;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const activeEl = container!.querySelector<HTMLElement>('[data-active="true"]');
      if (!activeEl) {
        setRect(null);
        return;
      }
      setRect({
        top: activeEl.offsetTop,
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
      });
      setReady(true);
    }

    measure();
    // A second pass one frame later catches layout that hadn't settled yet
    // on first measure (e.g. a scrollbar appearing, a parent still animating
    // in) — without it the pill can lock onto a stale, narrower/shorter box.
    const raf = requestAnimationFrame(measure);
    // Web fonts swapping in after first paint reflow text without changing
    // the container's own box size, so ResizeObserver on the container alone
    // can miss it — re-measure once the real font is active too.
    let cancelled = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    // Also watch the active element directly, not just the container — its
    // own size can change from text reflow even when the container's box
    // size stays fixed.
    const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) ro.observe(activeEl);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeSelector, containerRef]);

  if (!rect) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-md bg-gold-500/[0.09]",
        ready ? "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" : "",
        className,
      )}
      style={{
        top: axis !== "horizontal" ? rect.top : undefined,
        left: axis !== "vertical" ? rect.left : undefined,
        width: axis !== "vertical" ? rect.width : "100%",
        height: axis !== "horizontal" ? rect.height : "100%",
      }}
    />
  );
}
