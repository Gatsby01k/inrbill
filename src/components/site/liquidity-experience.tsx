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

export function LiquidityOrbit() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      root.style.setProperty("--orbit-x", `${(x - 0.5) * 18}px`);
      root.style.setProperty("--orbit-y", `${(y - 0.5) * 18}px`);
      root.style.setProperty("--shine-x", `${x * 100}%`);
      root.style.setProperty("--shine-y", `${y * 100}%`);
    };
    const reset = () => {
      root.style.setProperty("--orbit-x", "0px");
      root.style.setProperty("--orbit-y", "0px");
    };

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", reset);
    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", reset);
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
      <div className="v3-orbit-shine" aria-hidden="true" />

      <div className="v3-orbit-chip v3-orbit-chip-a">
        <span className="v3-chip-index">01</span>
        <span><small>Counterparty</small><strong>Human reviewed</strong></span>
      </div>
      <div className="v3-orbit-chip v3-orbit-chip-b">
        <span className="v3-live-dot" />
        <span><small>Capacity</small><strong>Current signal</strong></span>
      </div>
      <div className="v3-orbit-chip v3-orbit-chip-c">
        <BrandMark size={19} />
        <span><small>Introduction</small><strong>Controlled release</strong></span>
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
