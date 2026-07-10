"use client";

import Link from "next/link";
import { useState } from "react";
import { DAILY_VOLUME_BANDS, SPEED_OPTIONS } from "@/lib/options";

/**
 * "Calculator" is deliberately not a rate/pricing calculator — INRP2P
 * doesn't set rates and won't fabricate one (see corridor-content.ts's FAQ
 * copy). What this actually calculates is the right pre-filled form for a
 * visitor's specific volume and speed needs, using the exact same
 * query-param contract as the AI concierge and referral links
 * (src/lib/form-prefill.ts) — so by the time someone lands on /request or
 * /apply, the fields that matter most are already set.
 */
export function CorridorCalculator({
  requestType,
  directionValue,
}: {
  requestType: string;
  directionValue: string;
}) {
  const [side, setSide] = useState<"request" | "apply">("request");
  const [volumeBand, setVolumeBand] = useState<string>(DAILY_VOLUME_BANDS[2]);
  const [speed, setSpeed] = useState<string>(SPEED_OPTIONS[2]);

  const params = new URLSearchParams();
  if (side === "request") {
    params.set("requestType", requestType);
    params.set("dailyVolumeBand", volumeBand);
    params.set("requiredSpeed", speed);
  } else {
    params.append("directions", directionValue);
    params.set("dailyCapacityBand", volumeBand);
  }
  const href = side === "request" ? `/request?${params}` : `/apply?${params}`;

  return (
    <div className="card p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Get to the right form faster
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
        Answer a couple of questions and we&apos;ll hand you a form that&apos;s already filled in —
        this doesn&apos;t calculate a rate or promise a match, it just saves you the typing.
      </p>

      <div className="mt-4 flex gap-1.5">
        <button
          type="button"
          onClick={() => setSide("request")}
          className={side === "request" ? "chip border-gold-500/40 bg-gold-500/15 text-gold-800" : "chip border-black/10 bg-black/[0.03] text-slate-600"}
        >
          I need liquidity
        </button>
        <button
          type="button"
          onClick={() => setSide("apply")}
          className={side === "apply" ? "chip border-gold-500/40 bg-gold-500/15 text-gold-800" : "chip border-black/10 bg-black/[0.03] text-slate-600"}
        >
          I can offer capacity
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium text-slate-500">
            {side === "request" ? "Daily volume" : "Daily capacity"}
          </span>
          <select
            value={volumeBand}
            onChange={(e) => setVolumeBand(e.target.value)}
            className="input mt-1 text-xs"
          >
            {DAILY_VOLUME_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        {side === "request" ? (
          <label className="block">
            <span className="text-[11px] font-medium text-slate-500">Required speed</span>
            <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="input mt-1 text-xs">
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <Link href={href} className="btn btn-gold btn-sm mt-4 w-full text-center">
        {side === "request" ? "Continue to request form →" : "Continue to partner application →"}
      </Link>
    </div>
  );
}
