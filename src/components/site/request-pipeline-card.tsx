"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const STAGES = ["Submitted", "Reviewed", "Matched", "Introduced"] as const;
const STAGE_MS = 2200;
const PARTNER_COUNT = 7;
const STAR_COUNT = 44;

const GOLD = "255,153,51"; // gold-500
const GOLD_DEEP = "193,95,10"; // gold-700 — the stick, so it reads as brand metal, not a random brown prop
const LEAF = "23,138,56"; // leaf-500

type Node = { angle: number; x: number; y: number; depth: number; scale: number; pulse: number };
type Particle = { from: number; to: number; t: number; speed: number; color: string };
type Ripple = { x: number; y: number; r: number; alpha: number; color: string };
type Star = { fx: number; fy: number; r: number; phase: number };

/**
 * Hero visual — a canvas particle network, not a DOM stepper. Center "you"
 * node, an orbit of partner nodes projected as a tilted 3D ring (nodes
 * further "back" in the rotation render smaller/dimmer, "forward" render
 * bigger/brighter, sorted and drawn back-to-front every frame — the piece
 * that actually sells the depth), tilting toward the cursor for real
 * parallax (same lerped-follow technique as HeroRing).
 *
 * Layered on top for the "premium" pass: additive ("lighter") blending on
 * every glow so overlapping light actually brightens instead of just
 * alpha-stacking (real bloom, not a blur filter); a faint twinkling
 * starfield for depth behind the ring; a slow-breathing halo behind the
 * center node; comet trails behind traveling particles instead of bare
 * dots; and an expanding, fading ripple ring fired at the exact moment a
 * particle completes its journey (arrival at center, or — gold, the
 * "match" packet — arrival at a partner).
 *
 * The rim itself is styled as an actual tyre (inner/outer edge + rotating
 * tread ticks), and the cursor doubles as the stick in the classic
 * tyre-and-stick street game — get close enough to the rim and a stick
 * fades in, touching the tyre at the nearest point and visibly speeding
 * up the spin for as long as it's "pushing". Same idle spin either way,
 * this is purely an interactive flourish.
 *
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
    const ripples: Ripple[] = [];
    // Fractional (0..1) positions so the field scales with the card on
    // resize without needing to regenerate.
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      fx: Math.random(),
      fy: Math.random(),
      r: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));

    // Pointer-driven tilt, lerped toward the target each frame — same
    // technique as HeroRing, applied here to an actual 3D-ish projection
    // instead of a flat translate.
    let targetTiltX = 0;
    let targetTiltY = 0;
    let curTiltX = 0;
    let curTiltY = 0;

    // The gilli-danda/tyre-and-stick read: raw pointer position (canvas
    // CSS-pixel space) so the frame loop can find the point on the rim
    // closest to the cursor and, if close enough, treat it as a stick
    // "driving" the wheel — same street game where a stick keeps a rolled
    // rim spinning. Distance-to-rim decides how hard it's "pushing".
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;

    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetTiltY = px * 1.1;
      targetTiltX = py * 0.7;
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      pointerActive = true;
    }
    function onPointerLeave() {
      targetTiltX = 0;
      targetTiltY = 0;
      pointerActive = false;
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
      return { cx, cy, rx, ry };
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
    let clock = 0;
    let spawnTimer = 0;
    let matchTimer = 40;
    let pushStrength = 0;
    let contactAngle = 0;

    function frame() {
      clock += 0.02;
      curTiltX += (targetTiltX - curTiltX) * 0.06;
      curTiltY += (targetTiltY - curTiltY) * 0.06;

      // Where on the rim the "stick" is touching, and how hard — found
      // using this frame's ellipse before nodes advance, so the drive
      // speed below reflects what's actually about to be drawn.
      const cx0 = width / 2;
      const cy0 = height / 2;
      const rx0 = Math.min(width, height) * 0.4;
      const ry0 = rx0 * (0.3 + curTiltX * 0.22);
      let targetPush = 0;
      if (pointerActive && rx0 > 0) {
        const a = Math.atan2((pointerY - cy0) / (ry0 || 1), (pointerX - cx0) / rx0);
        const contactX = cx0 + Math.cos(a) * rx0;
        const contactY = cy0 + Math.sin(a) * ry0;
        const dist = Math.hypot(pointerX - contactX, pointerY - contactY);
        targetPush = Math.max(0, 1 - dist / 70);
        contactAngle = a;
      }
      pushStrength += (targetPush - pushStrength) * 0.12;

      // Idle spin plus however hard the stick is currently driving it —
      // literally "тez chalao" the tyre by keeping the cursor near the rim.
      const drive = 0.0009 + pushStrength * 0.012;
      nodes.forEach((n) => {
        n.angle += drive;
        n.pulse = Math.max(0, n.pulse - 0.018);
      });
      const { cx, cy, rx, ry } = layout();

      // Translucent overlay instead of a hard clear — leaves a soft trail
      // behind moving particles rather than a flat repaint every frame.
      ctx!.fillStyle = "rgba(11,18,32,0.32)";
      ctx!.fillRect(0, 0, width, height);

      // Twinkling starfield, additive so overlaps brighten instead of
      // washing out.
      ctx!.globalCompositeOperation = "lighter";
      stars.forEach((s) => {
        const tw = 0.1 + ((Math.sin(clock * 0.6 + s.phase) + 1) / 2) * 0.3;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255,255,255,${tw})`;
        ctx!.arc(s.fx * width, s.fy * height, s.r, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.globalCompositeOperation = "source-over";

      // The ring drawn as an actual tyre — outer + inner rim plus rotating
      // tread ticks between them — rather than a single bare ellipse.
      // Grounds the "wheel" read the node-orbit was always implying.
      ctx!.strokeStyle = "rgba(255,255,255,0.07)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(255,255,255,0.04)";
      ctx!.stroke();
      const TREAD_COUNT = 24;
      ctx!.strokeStyle = "rgba(255,255,255,0.09)";
      ctx!.lineWidth = 1.4;
      for (let i = 0; i < TREAD_COUNT; i++) {
        const a = (i / TREAD_COUNT) * Math.PI * 2 + curTiltY;
        const x1 = cx + Math.cos(a) * rx * 0.9;
        const y1 = cy + Math.sin(a) * ry * 0.9;
        const x2 = cx + Math.cos(a) * rx;
        const y2 = cy + Math.sin(a) * ry;
        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.stroke();
      }

      // The stick — only drawn once the cursor is close enough to the rim
      // to be "touching" it, fading in with pushStrength. Approaches from
      // just outside the tyre toward the contact point, with a small
      // bright spark where it makes contact.
      if (pushStrength > 0.02) {
        const contactX = cx + Math.cos(contactAngle) * rx;
        const contactY = cy + Math.sin(contactAngle) * ry;
        const dirX = contactX - cx || 1;
        const dirY = contactY - cy || 1;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const handleX = contactX + (dirX / dirLen) * 26;
        const handleY = contactY + (dirY / dirLen) * 26;

        ctx!.globalCompositeOperation = "source-over";
        ctx!.strokeStyle = `rgba(${GOLD_DEEP},${0.75 * pushStrength})`;
        ctx!.lineWidth = 2.4;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(handleX, handleY);
        ctx!.lineTo(contactX, contactY);
        ctx!.stroke();

        ctx!.globalCompositeOperation = "lighter";
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${GOLD},${0.9 * pushStrength})`;
        ctx!.shadowColor = `rgba(${GOLD},0.9)`;
        ctx!.shadowBlur = 10 * pushStrength;
        ctx!.arc(contactX, contactY, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = "source-over";
      }

      // Faint mesh between neighbouring partner nodes (ring order, not
      // draw order — the connections themselves don't change with tilt).
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

      // Particles: additive comet trails (a short fan of fading dots
      // behind the current position) instead of a single bare dot.
      ctx!.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.speed;
        const a = p.from === -1 ? { x: cx, y: cy } : nodes[p.from];
        const b = p.to === -1 ? { x: cx, y: cy } : nodes[p.to];

        for (let k = 4; k >= 0; k--) {
          const tt = Math.max(0, Math.min(1, p.t - k * 0.045));
          const x = a.x + (b.x - a.x) * tt;
          const y = a.y + (b.y - a.y) * tt;
          const fade = 1 - k / 5;
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${p.color},${0.85 * fade})`;
          ctx!.shadowColor = `rgba(${p.color},0.8)`;
          ctx!.shadowBlur = 8 * fade;
          ctx!.arc(x, y, 2.2 * fade, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.shadowBlur = 0;

        if (p.t >= 1) {
          const arrival = p.to === -1 ? { x: cx, y: cy } : nodes[p.to];
          ripples.push({ x: arrival.x, y: arrival.y, r: 2, alpha: 0.55, color: p.color });
          if (p.to === -1 && p.from !== -1) nodes[p.from].pulse = 1;
          if (p.from === -1 && p.to !== -1) nodes[p.to].pulse = 1;
          particles.splice(i, 1);
        }
      }

      // Expanding, fading confirmation rings at arrival points.
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 0.7;
        r.alpha -= 0.022;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        ctx!.strokeStyle = `rgba(${r.color},${r.alpha})`;
        ctx!.lineWidth = 1.4;
        ctx!.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx!.stroke();
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

      // Slow-breathing halo behind the center node, then the node itself.
      const haloR = 22 + Math.sin(clock * 0.9) * 6;
      const halo = ctx!.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, `rgba(${GOLD},0.22)`);
      halo.addColorStop(1, `rgba(${GOLD},0)`);
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${GOLD},0.95)`;
      ctx!.shadowColor = `rgba(${GOLD},0.75)`;
      ctx!.shadowBlur = 11;
      ctx!.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.globalCompositeOperation = "source-over";

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
