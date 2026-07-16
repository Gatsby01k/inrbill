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
    const desktop = window.matchMedia("(min-width: 1024px) and (min-height: 820px)").matches;
    if (reduced || !desktop) {
      root.style.setProperty("--wheel-rotation", "0deg");
      root.style.setProperty("--wheel-scale", "1");
      root.style.setProperty("--wheel-lift", "0px");
      return;
    }

    let target = 0;
    let current = 0;
    let frame = 0;
    let lastStage = 0;

    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
      target = clamp(-rect.top / travel);
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const render = () => {
      current += (target - current) * 0.115;
      if (Math.abs(target - current) < 0.0005) current = target;

      // A short backwards wind-up, then a two-turn inertial release and a
      // damped mechanical stop. The scroll controls the energy, not the cursor.
      const windupPhase = clamp(current / 0.09);
      const windup = current < 0.09 ? -9 * Math.sin(windupPhase * Math.PI) : 0;
      const release = clamp((current - 0.065) / 0.81);
      const eased = 1 - Math.pow(1 - release, 3.2);
      const damping = Math.sin(release * Math.PI * 5) * (1 - release) * 12;
      const rotation = windup + eased * 720 + damping;
      const scale = 1 - eased * 0.038 + Math.sin(release * Math.PI) * 0.012;
      const lift = -eased * 18;

      root.style.setProperty("--wheel-rotation", `${rotation.toFixed(3)}deg`);
      root.style.setProperty("--wheel-scale", scale.toFixed(4));
      root.style.setProperty("--wheel-lift", `${lift.toFixed(2)}px`);
      root.style.setProperty("--halo-a", `${(-13 - rotation * 0.12).toFixed(3)}deg`);
      root.style.setProperty("--halo-b", `${(18 + rotation * 0.08).toFixed(3)}deg`);
      root.style.setProperty("--launch-progress", eased.toFixed(4));
      root.dataset.launched = current > 0.075 ? "true" : "false";

      const stage = current < 0.24 ? 0 : current < 0.48 ? 1 : current < 0.73 ? 2 : 3;
      if (stage !== lastStage) {
        lastStage = stage;
        root.dataset.stage = String(stage);
        setActiveStage(stage);
      }

      if (Math.abs(target - current) > 0.0005) {
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
      <div className="v3-medallion-image" aria-hidden="true">
        <Image
          src="/brand/inrp2p-medallion.jpeg"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 92vw, 54vw"
        />
      </div>

      <div className="v3-launch-status" aria-hidden="true">
        <span className="v3-launch-status-mark"><BrandMark size={20} /></span>
        <span>
          <small>{launchStages[activeStage][0]} / Review wheel</small>
          <strong>{launchStages[activeStage][1]}</strong>
          <em>{launchStages[activeStage][2]}</em>
        </span>
      </div>

      <div className="v3-launch-sequence" aria-hidden="true">
        <p><span /> Scroll to launch</p>
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
        <span>No custody</span>
        <span>No execution</span>
      </div>
    </div>
  );
}
