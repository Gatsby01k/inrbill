"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";

const stages = [
  {
    code: "01",
    title: "Review",
    caption: "A counterparty becomes usable only after the evidence becomes clear.",
    leftLabel: "Trust passport",
    leftValue: "Human decision",
    rows: [
      ["Entity & ownership", "Reviewed"],
      ["Banking coverage", "Reviewed"],
      ["Sanctions screening", "Clear"],
      ["Wallet-risk evidence", "Recorded"],
    ],
    result: "Eligible for network access",
  },
  {
    code: "02",
    title: "Signal",
    caption: "Only current operating capacity is visible. Stale promises expire.",
    leftLabel: "Capacity window",
    leftValue: "Time-bound signal",
    rows: [
      ["Direction", "INR → USDT"],
      ["Settlement rail", "Bilateral"],
      ["Volume band", "Confirmed"],
      ["Availability", "Current"],
    ],
    result: "Capacity is route-ready",
  },
  {
    code: "03",
    title: "Route",
    caption: "Every shortlist is explainable and requirement-specific.",
    leftLabel: "Company requirement",
    leftValue: "Controlled routing",
    rows: [
      ["Corridor eligibility", "Match"],
      ["Live capacity", "Match"],
      ["Network permission", "Match"],
      ["Risk threshold", "Match"],
    ],
    result: "Qualified shortlist created",
  },
  {
    code: "04",
    title: "Introduce",
    caption: "Identity is released deliberately. Settlement stays outside INRP2P.",
    leftLabel: "Qualified match",
    leftValue: "Human-controlled release",
    rows: [
      ["Identity release", "Approved"],
      ["Commercial terms", "Bilateral"],
      ["Movement of funds", "Direct"],
      ["Decision record", "Written"],
    ],
    result: "Counterparties proceed directly",
  },
] as const;

const launchStages = [
  ["01", "Review", "Counterparty evidence"],
  ["02", "Signal", "Current capacity"],
  ["03", "Route", "Explainable match"],
  ["04", "Introduce", "Controlled release"],
] as const;

export function LiquidityOrbit() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hero = root.closest<HTMLElement>(".v3-hero");
    if (!hero) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.style.setProperty("--wheel-scale", "1");
      root.style.setProperty("--wheel-lift", "0px");
      root.style.setProperty("--scan-y", "50%");
      root.style.setProperty("--scan-opacity", "0");
      return;
    }

    let target = 0;
    let current = 0;
    let frame = 0;
    let lastStage = 0;

    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const smootherstep = (value: number) => value ** 3 * (value * (value * 6 - 15) + 10);
    const measure = () => {
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
      target = clamp((window.scrollY - heroTop) / travel);
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const render = () => {
      current += (target - current) * 0.075;
      if (Math.abs(target - current) < 0.00025) current = target;

      // The supplied artwork is already rendered in perspective, so rotating
      // the raster would create an artificial wobble. Keep the physical object
      // planted and let the verification system move around it instead.
      const eased = smootherstep(current);
      const focus = Math.sin(eased * Math.PI);
      const scale = 1 + focus * 0.006;
      const lift = -focus * 4;
      const scanY = 14 + eased * 70;
      const scanOpacity = Math.sin(current * Math.PI) * 0.82;
      const sheen = 29 + eased * 45;

      root.style.setProperty("--wheel-scale", scale.toFixed(4));
      root.style.setProperty("--wheel-lift", `${lift.toFixed(2)}px`);
      root.style.setProperty("--shadow-scale", (1 + focus * 0.018).toFixed(4));
      root.style.setProperty("--sheen-x", `${sheen.toFixed(2)}%`);
      root.style.setProperty("--sheen-opacity", (0.08 + scanOpacity * 0.12).toFixed(4));
      root.style.setProperty("--scan-y", `${scanY.toFixed(2)}%`);
      root.style.setProperty("--scan-opacity", scanOpacity.toFixed(4));
      root.style.setProperty("--halo-a", `${(-13 + eased * 64).toFixed(3)}deg`);
      root.style.setProperty("--halo-b", `${(18 - eased * 46).toFixed(3)}deg`);
      root.style.setProperty("--launch-progress", eased.toFixed(4));
      root.dataset.launched = current > 0.04 ? "true" : "false";
      root.dataset.locked = current > 0.88 ? "true" : "false";

      const stage = current < 0.2 ? 0 : current < 0.45 ? 1 : current < 0.7 ? 2 : 3;
      if (stage !== lastStage) {
        lastStage = stage;
        root.dataset.stage = String(stage);
        setActiveStage(stage);
      }

      if (Math.abs(target - current) > 0.00025) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    measure();
    root.dataset.stage = "0";
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="v3-orbit" aria-label="INRP2P verified liquidity network">
      <div className="v3-orbit-halo v3-orbit-halo-a" aria-hidden="true" />
      <div className="v3-orbit-halo v3-orbit-halo-b" aria-hidden="true" />
      <div className="v3-orbit-rail v3-orbit-rail-a" aria-hidden="true"><i /><i /><i /></div>
      <div className="v3-orbit-rail v3-orbit-rail-b" aria-hidden="true"><i /><i /></div>

      <div className="v3-wheel-shadow" aria-hidden="true" />
      <div className="v3-wheel-gyro v3-wheel-gyro-a" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="v3-wheel-gyro v3-wheel-gyro-b" aria-hidden="true"><i /><i /><i /></div>
      <div className="v3-wheel-assembly" aria-hidden="true">
        <div className="v3-medallion-image">
          <Image src="/brand/inrp2p-wheel-transparent.webp" alt="" fill priority sizes="(max-width: 1024px) 92vw, 54vw" />
        </div>
        <div className="v3-wheel-sheen" />
        <div className="v3-wheel-scan" />
      </div>
      <div className="v3-wheel-lock" aria-hidden="true"><i /> Introduction ready</div>

      <div className="v3-launch-status" aria-hidden="true">
        <span className="v3-launch-status-mark"><BrandMark size={20} /></span>
        <span key={activeStage}>
          <small>{launchStages[activeStage][0]} / Verification sequence</small>
          <strong>{launchStages[activeStage][1]}</strong>
          <em>{launchStages[activeStage][2]}</em>
        </span>
      </div>

      <div className="v3-launch-sequence" aria-hidden="true">
        <p><span /> Scroll to verify</p>
        <div className="v3-launch-track">
          {launchStages.map(([code, title], index) => (
            <div key={code} className={index < activeStage ? "is-complete" : index === activeStage ? "is-active" : undefined}>
              <i /><span>{code}</span><strong>{title}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NetworkConsole() {
  const [active, setActive] = useState(0);
  const stage = stages[active];

  return (
    <div className="v3-console">
      <div className="v3-console-topbar">
        <div className="v3-console-title"><BrandMark size={20} /><span>INRP2P / operating logic</span></div>
        <div className="v3-console-state"><i /> Human control active</div>
      </div>

      <div className="v3-console-tabs" role="tablist" aria-label="Operating stages">
        {stages.map((item, index) => (
          <button
            key={item.code}
            type="button"
            role="tab"
            aria-selected={active === index}
            className={active === index ? "is-active" : undefined}
            onClick={() => setActive(index)}
          >
            <span>{item.code}</span>{item.title}
          </button>
        ))}
      </div>

      <div className="v3-console-stage" role="tabpanel" key={stage.code}>
        <div className="v3-console-context">
          <p>{stage.leftLabel}</p>
          <strong>{stage.leftValue}</strong>
          <span>{stage.caption}</span>
        </div>

        <div className="v3-console-route" aria-hidden="true">
          <span /><i /><BrandMark size={32} /><i /><span />
        </div>

        <div className="v3-console-record">
          <div className="v3-record-head"><span>Decision basis</span><small>{stage.code} / 04</small></div>
          {stage.rows.map(([label, value]) => (
            <div className="v3-record-row" key={label}>
              <span>{label}</span><strong><i />{value}</strong>
            </div>
          ))}
          <div className="v3-record-result"><BrandMark size={18} /><span>{stage.result}</span></div>
        </div>
      </div>

      <div className="v3-console-foot">
        <span>Every decision is explainable</span>
        <span>No custody of deal funds</span>
        <span>No execution</span>
      </div>
    </div>
  );
}
