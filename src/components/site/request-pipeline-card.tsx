"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const STAGES = ["Submitted", "Reviewed", "Matched", "Introduced"] as const;
const STAGE_MS = 2200;

const GOLD = "255,153,51"; // gold-500 — your side
const LEAF = "23,138,56"; // leaf-500 — the partner's side

/**
 * Hero visual, rewritten a fourth time after direct feedback that a
 * 7-node particle network — however much bloom, tread and parallax got
 * layered onto it — still read as decoration, not a deal. This version
 * is deliberately the opposite: two nodes, one line. You, on the left.
 * A reviewed partner, on the right. A single packet travels the line
 * between them and the line itself only turns solid gold-to-leaf at the
 * exact moment the stage labels below say "Introduced" — the visual and
 * the words are now driven by the same state instead of being two
 * unrelated animations running next to each other, which was probably
 * a real part of why the network version felt hollow regardless of how
 * it was styled.
 *
 * Still canvas, still no dependency, still a single static frame under
 * prefers-reduced-motion.
 */
export function RequestPipelineCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const stageRef = useRef(0);

  useEffect(() => {
    stageRef.current = stageIdx;
  }, [stageIdx]);

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

    // Endpoints + curve control point (a slight upward bow reads less
    // static than a dead-flat line without adding any real complexity).
    function geometry() {
      const ax = width * 0.16;
      const ay = height * 0.56;
      const bx = width * 0.84;
      const by = height * 0.56;
      const cx = width * 0.5;
      const cy = height * 0.22;
      return { ax, ay, bx, by, cx, cy };
    }
    function pointOnCurve(t: number) {
      const { ax, ay, bx, by, cx, cy } = geometry();
      const it = 1 - t;
      return {
        x: it * it * ax + 2 * it * t * cx + t * t * bx,
        y: it * it * ay + 2 * it * t * cy + t * t * by,
      };
    }

    // targetProgress mirrors the stage the label row is showing: 0 = at
    // "You", ~0.42 = the review checkpoint, 1 = arrived at the partner.
    // Stage 3 ("Introduced") holds the packet at 1 and instead fades in
    // the solid settled line; the loop back to stage 0 pulls everything
    // back to the start.
    function targetForStage(stage: number) {
      if (stage === 0) return 0;
      if (stage === 1) return 0.42;
      return 1;
    }

    function drawStatic() {
      const { ax, ay, bx, by } = geometry();
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#0b1220";
      ctx!.fillRect(0, 0, width, height);
      ctx!.strokeStyle = `rgba(${GOLD},0.35)`;
      ctx!.lineWidth = 1.6;
      ctx!.beginPath();
      const g = geometry();
      ctx!.moveTo(ax, ay);
      ctx!.quadraticCurveTo(g.cx, g.cy, bx, by);
      ctx!.stroke();
      [
        { x: ax, y: ay, color: GOLD },
        { x: bx, y: by, color: LEAF },
      ].forEach((n) => {
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${n.color},0.9)`;
        ctx!.arc(n.x, n.y, 5, 0, Math.PI * 2);
        ctx!.fill();
      });
    }

    if (reduceMotion) {
      drawStatic();
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let progress = 0;
    let settleAlpha = 0;
    let pulseA = 1; // fresh pop on load
    let pulseB = 0;
    let pulseCheckpoint = 0;
    let passedCheckpoint = false;

    // Trail: a short ring buffer of recent packet positions.
    const TRAIL_LEN = 10;
    const trail: { x: number; y: number }[] = [];

    function frame() {
      const stage = stageRef.current;
      const target = targetForStage(stage);
      progress += (target - progress) * 0.05;
      if (stage === 0 && target === 0 && progress < 0.02) {
        progress = 0;
        passedCheckpoint = false;
      }
      if (!passedCheckpoint && progress > 0.4) {
        passedCheckpoint = true;
        pulseCheckpoint = 1;
      }
      if (progress > 0.92 && stage >= 2) pulseB = Math.max(pulseB, 1);

      const settleTarget = stage === 3 ? 1 : 0;
      settleAlpha += (settleTarget - settleAlpha) * 0.06;
      pulseA = Math.max(0, pulseA - 0.02);
      pulseB = Math.max(0, pulseB - 0.02);
      pulseCheckpoint = Math.max(0, pulseCheckpoint - 0.025);

      ctx!.fillStyle = "rgba(11,18,32,0.4)";
      ctx!.fillRect(0, 0, width, height);

      const { ax, ay, bx, by, cx, cy } = geometry();

      // Base line, faint.
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.lineWidth = 1.4;
      ctx!.beginPath();
      ctx!.moveTo(ax, ay);
      ctx!.quadraticCurveTo(cx, cy, bx, by);
      ctx!.stroke();

      // Settled line: solid gold-to-leaf gradient, only once "Introduced".
      if (settleAlpha > 0.01) {
        const grad = ctx!.createLinearGradient(ax, ay, bx, by);
        grad.addColorStop(0, `rgba(${GOLD},${0.85 * settleAlpha})`);
        grad.addColorStop(1, `rgba(${LEAF},${0.85 * settleAlpha})`);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 2.2;
        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.quadraticCurveTo(cx, cy, bx, by);
        ctx!.stroke();
      }

      // Review checkpoint marker.
      const checkpoint = pointOnCurve(0.42);
      ctx!.globalCompositeOperation = "lighter";
      ctx!.beginPath();
      ctx!.strokeStyle = `rgba(255,255,255,${0.25 + pulseCheckpoint * 0.5})`;
      ctx!.lineWidth = 1.4;
      ctx!.arc(checkpoint.x, checkpoint.y, 4 + pulseCheckpoint * 4, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.globalCompositeOperation = "source-over";

      // Packet + comet trail.
      const p = pointOnCurve(Math.max(0, Math.min(1, progress)));
      trail.unshift({ x: p.x, y: p.y });
      if (trail.length > TRAIL_LEN) trail.pop();
      const packetColor = progress < 0.5 ? GOLD : LEAF;
      ctx!.globalCompositeOperation = "lighter";
      trail.forEach((pt, i) => {
        const fade = 1 - i / TRAIL_LEN;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${packetColor},${0.8 * fade})`;
        ctx!.shadowColor = `rgba(${packetColor},0.8)`;
        ctx!.shadowBlur = 8 * fade;
        ctx!.arc(pt.x, pt.y, 2.6 * fade, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.shadowBlur = 0;

      // Nodes.
      const nodeGlow = (base: number, pulse: number) => Math.min(1, base + pulse * 0.6);
      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${GOLD},${nodeGlow(0.75, pulseA)})`;
      ctx!.shadowColor = `rgba(${GOLD},0.85)`;
      ctx!.shadowBlur = 6 + pulseA * 12;
      ctx!.arc(ax, ay, 5 + pulseA * 2.5, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;

      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${LEAF},${nodeGlow(0.75, pulseB)})`;
      ctx!.shadowColor = `rgba(${LEAF},0.85)`;
      ctx!.shadowBlur = 6 + pulseB * 12;
      ctx!.arc(bx, by, 5 + pulseB * 2.5, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.globalCompositeOperation = "source-over";

      // Labels.
      ctx!.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx!.textAlign = "center";
      ctx!.fillStyle = "rgba(255,255,255,0.4)";
      ctx!.fillText("You", ax, ay + 22);
      ctx!.fillText("Partner", bx, by + 22);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
