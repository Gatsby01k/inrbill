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
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
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
    let previousRotation = 0;
    const startedAt = performance.now();

    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const measure = () => {
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
      target = clamp((window.scrollY - heroTop) / travel);
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const render = (timestamp: number) => {
      current += (target - current) * 0.115;
      if (Math.abs(target - current) < 0.0005) current = target;

      // The engine briefly calibrates on arrival, then the first scroll creates
      // a backwards wind-up and a three-turn inertial release. No hover gimmick:
      // page movement is the source of mechanical energy.
      const calibrationProgress = clamp((timestamp - startedAt) / 1400);
      const calibrating = target < 0.015 && calibrationProgress < 1;
      const calibration = calibrating
        ? Math.sin(calibrationProgress * Math.PI * 2.4) * (1 - calibrationProgress) * 22
        : 0;
      const windupPhase = clamp(current / 0.075);
      const windup = current < 0.075 ? -13 * Math.sin(windupPhase * Math.PI) : 0;
      const release = clamp((current - 0.018) / 0.88);
      const eased = 1 - Math.pow(1 - release, 3.2);
      const damping = Math.sin(release * Math.PI * 6) * (1 - release) * 17;
      const rotation = calibration + windup + eased * 1080 + damping;
      const scale = 1 - eased * 0.038 + Math.sin(release * Math.PI) * 0.012;
      const lift = -eased * 18;
      const angularVelocity = rotation - previousRotation;
      previousRotation = rotation;
      const speed = clamp(Math.abs(angularVelocity) / 12);
      const needle = -speed * 14 + Math.sin((rotation * Math.PI) / 18) * speed * 9;
      const tiltX = 1.8 - eased * 3.2 + Math.sin(release * Math.PI) * 1.2;
      const tiltY = -Math.sin(release * Math.PI) * 5.5;
      const sheen = 50 + Math.sin((rotation * Math.PI) / 180) * 24;

      root.style.setProperty("--wheel-rotation", `${rotation.toFixed(3)}deg`);
      root.style.setProperty("--wheel-scale", scale.toFixed(4));
      root.style.setProperty("--wheel-lift", `${lift.toFixed(2)}px`);
      root.style.setProperty("--wheel-tilt-x", `${tiltX.toFixed(3)}deg`);
      root.style.setProperty("--wheel-tilt-y", `${tiltY.toFixed(3)}deg`);
      root.style.setProperty("--needle-angle", `${needle.toFixed(3)}deg`);
      root.style.setProperty("--shadow-scale", (1 - eased * 0.055).toFixed(4));
      root.style.setProperty("--sheen-x", `${sheen.toFixed(2)}%`);
      root.style.setProperty("--halo-a", `${(-13 - rotation * 0.12).toFixed(3)}deg`);
      root.style.setProperty("--halo-b", `${(18 + rotation * 0.08).toFixed(3)}deg`);
      root.style.setProperty("--launch-progress", eased.toFixed(4));
      root.dataset.launched = current > 0.075 ? "true" : "false";
      root.dataset.locked = current > 0.975 ? "true" : "false";

      const stage = current < 0.24 ? 0 : current < 0.48 ? 1 : current < 0.73 ? 2 : 3;
      if (stage !== lastStage) {
        lastStage = stage;
        root.dataset.stage = String(stage);
        setActiveStage(stage);
      }

      if (Math.abs(target - current) > 0.0005 || calibrating) {
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
        <div className="v3-wheel-depth">
          <Image src="/brand/inrp2p-wheel-transparent.webp" alt="" fill priority sizes="(max-width: 1024px) 92vw, 54vw" />
        </div>
        <div className="v3-medallion-image">
          <Image src="/brand/inrp2p-wheel-transparent.webp" alt="" fill priority sizes="(max-width: 1024px) 92vw, 54vw" />
        </div>
        <div className="v3-wheel-sheen" />
      </div>
      <div className="v3-wheel-pointer" aria-hidden="true"><span /><i /></div>
      <div className="v3-wheel-lock" aria-hidden="true"><i /> Route locked</div>

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
