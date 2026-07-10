"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const STAGES = ["Submitted", "Reviewed", "Matched", "Introduced"] as const;
const STAGE_MS = 2200;
const PARTNER_COUNT = 7;

const GOLD = "255,153,51";
const LEAF = "23,138,56";

type Node = { angle: number; x: number; y: number; depth: number; scale: number; pulse: number };
type Particle = { from: number; to: number; t: number; speed: number; color: string };

/**
 * Hero visual, rebuilt a third time on direct feedback that a stepper list
 * (even styled as an audit log) still read as flat and static. This is a
 * canvas particle network: a center "you" node, an orbit of partner nodes
 * projected as a tilted 3D ring (a cheap perspective trick — nodes further
 * "back" in the rotation render smaller/dimmer, nodes "forward" render
 * bigger/brighter, sorted and drawn back-to-front every frame), faint mesh
 * lines between them, and small glowing packets continuously flowing in
 * from partners and — periodically — a bright packet flowing out to a
 * partner that lights up (the "match" moment). The ring also tilts toward
 * the cursor for real parallax, same lerped-follow technique as HeroRing.
 * No new dependency — canvas is a native browser API, no WebGL. Falls back
 * to a single static frame under prefers-reduced-motion. Stage labels
 * below keep the plain-English explanation the visual alone doesn't carry.
 */
export function RequestPipelineCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStageIdx((s) => (s + 1) % STAGES.length), STAGE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrap || !ctx) return;

    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const nodes: Node[] = Array.from({ length: PARTNER_COUNT }, (_, i) => ({
      angle: (i / PARTNER_COUNT) * Math.PI * 2 - Math.PI / 2,
      x: 0,
      y: 0,
      depth: 0,
      scale: 1,
      pulse: 0,
    }));
    const particles: Particle[] = [];

    // Pointer-driven tilt, lerped toward the target each frame — same
    // technique as HeroRing, applied here to an actual 3D-ish projection
    // instead of a flat translate.
    let targetTiltX = 0;
    let targetTiltY = 0;
    let curTiltX = 0;
    let curTiltY = 0;

    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      targetTiltY = ((e.clientX - rect.left) / rect.width - 0.5) * 1.1;
      targetTiltX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.7;
    }
    function onPointerLeave() {
      targetTiltX = 0;
      targetTiltY = 0;
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    function layout() {
      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.min(width, height) * 0.4;
      const ry = rx * (0.3 + curTiltX * 0.22);
      nodes.forEach((n) => {
        const a = n.angle + curTiltY;
        const depth = Math.sin(a); // -1 (back) .. 1 (front)
        n.x = cx + Math.cos(a) * rx;
        n.y = cy + depth * ry;
        n.depth = depth;
        n.scale = 0.55 + ((depth + 1) / 2) * 0.85;
      });
      return { cx, cy };
    }

    function drawStatic() {
      const { cx, cy } = layout();
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#0b1220";
      ctx!.fillRect(0, 0, width, height);
      ctx!.strokeStyle = "rgba(255,255,255,0.06)";
      nodes.forEach((n) => {
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(n.x, n.y);
        ctx!.stroke();
      });
      [...nodes]
        .sort((a, b) => a.depth - b.depth)
        .forEach((n) => {
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${LEAF},${0.35 + ((n.depth + 1) / 2) * 0.5})`;
          ctx!.arc(n.x, n.y, 2.6 * n.scale, 0, Math.PI * 2);
          ctx!.fill();
        });
      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${GOLD},0.9)`;
      ctx!.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx!.fill();
    }

    if (reduceMotion) {
      drawStatic();
      return () => {
        window.removeEventListener("resize", resize);
        wrap!.removeEventListener("pointermove", onPointerMove);
        wrap!.removeEventListener("pointerleave", onPointerLeave);
      };
    }

    let raf = 0;
    let spawnTimer = 0;
    let matchTimer = 40;

    function frame() {
      curTiltX += (targetTiltX - curTiltX) * 0.06;
      curTiltY += (targetTiltY - curTiltY) * 0.06;

      nodes.forEach((n) => {
        n.angle += 0.0009;
        n.pulse = Math.max(0, n.pulse - 0.018);
      });
      const { cx, cy } = layout();

      // Translucent overlay instead of a hard clear — leaves a soft trail
      // behind moving particles rather than a flat repaint every frame.
      ctx!.fillStyle = "rgba(11,18,32,0.32)";
      ctx!.fillRect(0, 0, width, height);

      // Faint mesh between neighbouring partner nodes (ring order, not
      // draw order — the connections themselves don't change with tilt).
      ctx!.lineWidth = 1;
      nodes.forEach((n, i) => {
        const next = nodes[(i + 1) % nodes.length];
        const meshDepth = (n.depth + next.depth) / 2;
        ctx!.strokeStyle = `rgba(255,255,255,${0.025 + ((meshDepth + 1) / 2) * 0.05})`;
        ctx!.beginPath();
        ctx!.moveTo(n.x, n.y);
        ctx!.lineTo(next.x, next.y);
        ctx!.stroke();
      });

      // Faint spokes to the center "you" node.
      nodes.forEach((n) => {
        ctx!.strokeStyle = `rgba(${GOLD},${0.04 + ((n.depth + 1) / 2) * 0.05})`;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(n.x, n.y);
        ctx!.stroke();
      });

      spawnTimer++;
      if (spawnTimer > 65) {
        spawnTimer = 0;
        const idx = Math.floor(Math.random() * PARTNER_COUNT);
        particles.push({ from: idx, to: -1, t: 0, speed: 0.007 + Math.random() * 0.004, color: LEAF });
      }
      matchTimer++;
      if (matchTimer > 240) {
        matchTimer = 0;
        const idx = Math.floor(Math.random() * PARTNER_COUNT);
        particles.push({ from: -1, to: idx, t: 0, speed: 0.011, color: GOLD });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.speed;
        const a = p.from === -1 ? { x: cx, y: cy } : nodes[p.from];
        const b = p.to === -1 ? { x: cx, y: cy } : nodes[p.to];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${p.color},0.95)`;
        ctx!.shadowColor = `rgba(${p.color},0.85)`;
        ctx!.shadowBlur = 9;
        ctx!.arc(x, y, 2.3, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;

        if (p.t >= 1) {
          if (p.to === -1 && p.from !== -1) nodes[p.from].pulse = 1;
          if (p.from === -1 && p.to !== -1) nodes[p.to].pulse = 1;
          particles.splice(i, 1);
        }
      }

      // Back-to-front so front-of-ring nodes visually sit above the mesh
      // and the back-of-ring nodes behind them — the piece that actually
      // sells the 3D read.
      [...nodes]
        .sort((a, b) => a.depth - b.depth)
        .forEach((n) => {
          const base = 0.3 + ((n.depth + 1) / 2) * 0.55;
          const glow = Math.min(1, base + n.pulse * 0.5);
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${LEAF},${glow})`;
          ctx!.shadowColor = `rgba(${LEAF},0.85)`;
          ctx!.shadowBlur = (4 + n.pulse * 12) * n.scale;
          ctx!.arc(n.x, n.y, (2.6 + n.pulse * 2.2) * n.scale, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        });

      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${GOLD},0.95)`;
      ctx!.shadowColor = `rgba(${GOLD},0.75)`;
      ctx!.shadowBlur = 11;
      ctx!.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      wrap!.removeEventListener("pointermove", onPointerMove);
      wrap!.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className="card relative overflow-hidden border-white/10 bg-[#0b1220] shadow-raised">
      <div className="relative z-10 flex items-center justify-between gap-2.5 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={18} />
          <p className="font-mono text-[11px] tracking-wide text-white/50">Live matching network</p>
        </div>
        <span className="font-mono text-[10.5px] text-white/30">INR → USDT</span>
      </div>

      <div ref={wrapRef} className="relative h-[260px] w-full">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 border-t border-white/10 bg-white/[0.02] px-5 py-2.5">
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={cn(
              "font-mono text-[10px] tracking-wide transition-colors duration-300",
              i === stageIdx ? "text-gold-400" : "text-white/25",
            )}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex items-center gap-2.5 border-t border-white/10 px-5 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf-400" />
        <p className="text-[12px] leading-relaxed text-white/50">
          Settlement happens directly between you and the partner.
        </p>
      </div>
    </div>
  );
}
