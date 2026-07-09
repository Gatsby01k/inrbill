import type { Direction } from "@prisma/client";
import { db } from "@/lib/db";
import { BANK_OPTIONS, DIRECTION_OPTIONS, METHOD_OPTIONS } from "@/lib/options";

// Shared by the public /inr-p2p-index page and its embeddable badge route,
// so both always read the exact same aggregate — never individually
// identifying, coverage-only data pulled from verified/limited partners.

export type CorridorCoverage = {
  label: string;
  count: number;
  banks: string[];
  methods: string[];
};

export type LiquidityIndexSnapshot = {
  total: number;
  verified: number;
  corridors: CorridorCoverage[];
  corridorsCovered: number;
  corridorsTotal: number;
  banksCovered: number;
  banksTotal: number;
  methodsCovered: number;
  methodsTotal: number;
  updatedOn: string;
};

function emptyLiquidityIndexSnapshot(): LiquidityIndexSnapshot {
  return {
    total: 0,
    verified: 0,
    corridors: DIRECTION_OPTIONS.map((d) => ({ label: d.label, count: 0, banks: [], methods: [] })),
    corridorsCovered: 0,
    corridorsTotal: DIRECTION_OPTIONS.length,
    banksCovered: 0,
    banksTotal: BANK_OPTIONS.length,
    methodsCovered: 0,
    methodsTotal: METHOD_OPTIONS.length,
    updatedOn: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Never let a DB hiccup — or, as happened once, a schema/DB drift where a
 * migration hadn't landed yet — take down the whole page (or the build's
 * static prerender pass, which runs this too). Degrade to an honest empty
 * snapshot and log server-side instead of throwing.
 */
export async function getLiquidityIndexSnapshot(): Promise<LiquidityIndexSnapshot> {
  try {
    const partners = await db.partnerProfile.findMany({
      where: { status: { in: ["VERIFIED", "LIMITED"] } },
      select: { directions: true, banks: true, methods: true, status: true },
    });

    const total = partners.length;
    const verified = partners.filter((p) => p.status === "VERIFIED").length;

    const corridors: CorridorCoverage[] = DIRECTION_OPTIONS.map((d) => {
      const value = d.value as Direction;
      const inCorridor = partners.filter((p) => p.directions.includes(value));
      const banks = Array.from(new Set(inCorridor.flatMap((p) => p.banks))).filter((b) =>
        (BANK_OPTIONS as readonly string[]).includes(b),
      );
      const methods = Array.from(new Set(inCorridor.flatMap((p) => p.methods))).filter((m) =>
        (METHOD_OPTIONS as readonly string[]).includes(m),
      );
      return { label: d.label, count: inCorridor.length, banks, methods };
    });

    return {
      total,
      verified,
      corridors,
      corridorsCovered: corridors.filter((c) => c.count > 0).length,
      corridorsTotal: DIRECTION_OPTIONS.length,
      banksCovered: new Set(partners.flatMap((p) => p.banks)).size,
      banksTotal: BANK_OPTIONS.length,
      methodsCovered: new Set(partners.flatMap((p) => p.methods)).size,
      methodsTotal: METHOD_OPTIONS.length,
      updatedOn: new Date().toISOString().slice(0, 10),
    };
  } catch (err) {
    console.error("getLiquidityIndexSnapshot failed — returning empty snapshot", err);
    return emptyLiquidityIndexSnapshot();
  }
}

// ── Reference rate index ─────────────────────────────────────────────────────
// Aggregated from admin-entered settlement rates on closed introductions.
// Never shown per-deal, never shown below a minimum sample size — an empty
// or single-data-point "index" would be worse than no index at all.

const RATE_WINDOW_DAYS = 14;
const RATE_MIN_SAMPLE = 3;

const RATE_CORRIDOR_LABELS: Partial<Record<Direction, string>> = {
  INR_TO_USDT: "INR → USDT",
  USDT_TO_INR: "USDT → INR",
};

export type RateIndexEntry = {
  direction: Direction;
  label: string;
  count: number;
  min: number;
  max: number;
  median: number;
};

export type RateIndexSnapshot = {
  entries: RateIndexEntry[];
  windowDays: number;
  minSample: number;
};

export async function getRateIndexSnapshot(): Promise<RateIndexSnapshot> {
  const empty: RateIndexSnapshot = { entries: [], windowDays: RATE_WINDOW_DAYS, minSample: RATE_MIN_SAMPLE };
  try {
    const since = new Date(Date.now() - RATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const rows = await db.introduction.findMany({
      where: { settledRate: { not: null }, updatedAt: { gte: since } },
      select: {
        settledRate: true,
        match: { select: { request: { select: { direction: true } } } },
      },
    });

    const byDirection = new Map<Direction, number[]>();
    for (const row of rows) {
      if (row.settledRate == null) continue;
      const direction = row.match.request.direction;
      if (!(direction in RATE_CORRIDOR_LABELS)) continue;
      const list = byDirection.get(direction) ?? [];
      list.push(Number(row.settledRate));
      byDirection.set(direction, list);
    }

    const entries: RateIndexEntry[] = [];
    for (const direction of Object.keys(RATE_CORRIDOR_LABELS) as Direction[]) {
      const values = (byDirection.get(direction) ?? []).slice().sort((a, b) => a - b);
      if (values.length < RATE_MIN_SAMPLE) continue;
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      entries.push({
        direction,
        label: RATE_CORRIDOR_LABELS[direction]!,
        count: values.length,
        min: values[0],
        max: values[values.length - 1],
        median,
      });
    }

    return { entries, windowDays: RATE_WINDOW_DAYS, minSample: RATE_MIN_SAMPLE };
  } catch (err) {
    // Covers the exact failure mode that broke the first deploy of this
    // feature: code shipped referencing a column before `prisma db push`
    // had run against the target database. Degrade, don't crash the build.
    console.error("getRateIndexSnapshot failed — returning empty snapshot", err);
    return empty;
  }
}
