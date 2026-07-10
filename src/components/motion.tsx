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

/* ── KineticText ───────────────────────────────────────────────
   Splits a short line into words and reveals them one at a time on
   scroll-in (each word gets its own --kw-i-driven delay via the
   .kinetic-word rule in globals.css — reuses the same revealScale
   keyframe Reveal already uses, no new keyframe needed). Optionally
   marks specific words with a gradient/italic treatment via
   `highlight` — meant for one deliberate "money word" per line, not
   a general-purpose rich-text renderer. Built for short headline-
   length statements (a slogan, a manifesto line), not paragraphs. */

type KineticTag = "h1" | "h2" | "p" | "div";
const KINETIC_FALLBACK_MS = 900;

export function KineticText({
  text,
  className,
  wordClassName,
  highlight,
  highlightClassName = "text-gradient-brand animate-gradient-shift italic",
  as = "p",
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  /** Bare words (no punctuation) to render with highlightClassName. */
  highlight?: string[];
  highlightClassName?: string;
  as?: KineticTag;
}) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement & HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Belt-and-suspenders: whatever the observer below does, force the
    // text visible shortly after mount regardless — this can never end up
    // permanently blank just because an observer didn't fire.
    const fallback = setTimeout(() => setInView(true), KINETIC_FALLBACK_MS);
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return () => clearTimeout(fallback);
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
      { threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  const words = text.split(" ");
  const content = words.map((w, i) => {
    const bare = w.replace(/[.,!?]/g, "").toLowerCase();
    const isHighlight = highlight?.some((h) => h.toLowerCase() === bare);
    return (
      <span
        key={i}
        className={cn("kinetic-word", wordClassName, isHighlight && highlightClassName)}
        style={{ "--kw-i": i, opacity: inView ? undefined : 0 } as React.CSSProperties}
      >
        {w}
        {i < words.length - 1 ? " " : ""}
      </span>
    );
  });

  const props = {
    ref,
    "data-kinetic": inView ? ("in" as const) : undefined,
    className,
  };

  if (as === "h1") return <h1 {...props}>{content}</h1>;
  if (as === "h2") return <h2 {...props}>{content}</h2>;
  if (as === "div") return <div {...props}>{content}</div>;
  return <p {...props}>{content}</p>;
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
