// Data assembly for the programmatic SEO corridor pages
// (src/app/corridors/[slug]/page.tsx) and the rate/speed calculator embedded
// on them. Every number here already exists elsewhere in the codebase —
// buildCorridorStats (demand/supply), getLiquidityIndexSnapshot/
// getRateIndexSnapshot (coverage + settlement-rate range), computeTimingAverages
// (turnaround) — this file's only job is to fetch the direction-scoped slice
// of each and assemble one snapshot per corridor. No new arithmetic, no AI,
// same "deterministic facts only" rule as analytics.ts and market-intelligence.ts.

import type { Direction } from "@prisma/client";
import { computeTimingAverages } from "@/lib/analytics";
import { db } from "@/lib/db";
import { directionLabel } from "@/lib/format";
import { getLiquidityIndexSnapshot, getRateIndexSnapshot } from "@/lib/liquidity-index";
import { buildCorridorStats } from "@/lib/market-intelligence";
import { DIRECTION_OPTIONS } from "@/lib/options";

export type CorridorSlug = "inr-to-usdt" | "usdt-to-inr" | "inr-payouts";

const SLUG_TO_DIRECTION: Record<CorridorSlug, Direction> = {
  "inr-to-usdt": "INR_TO_USDT",
  "usdt-to-inr": "USDT_TO_INR",
  "inr-payouts": "INR_PAYOUTS",
};
const DIRECTION_TO_SLUG: Record<Direction, CorridorSlug> = {
  INR_TO_USDT: "inr-to-usdt",
  USDT_TO_INR: "usdt-to-inr",
  INR_PAYOUTS: "inr-payouts",
};

export const CORRIDOR_SLUGS: CorridorSlug[] = ["inr-to-usdt", "usdt-to-inr", "inr-payouts"];

export function slugToDirection(slug: string): Direction | null {
  return slug in SLUG_TO_DIRECTION ? SLUG_TO_DIRECTION[slug as CorridorSlug] : null;
}

export function directionToSlug(direction: Direction): CorridorSlug {
  return DIRECTION_TO_SLUG[direction];
}

export type CorridorSnapshot = {
  direction: Direction;
  slug: CorridorSlug;
  label: string;
  requestsLast14d: number;
  requestsPrior14d: number;
  activePartners: number;
  banks: string[];
  methods: string[];
  rate: { min: number; max: number; median: number; count: number; windowDays: number } | null;
  timing: {
    avgHoursToFirstMatch: number | null;
    avgHoursToClose: number | null;
    sample: number;
  };
};

/** Everything a single corridor page needs, in one call. Reuses the exact
    same aggregate functions the admin analytics/index pages call — a
    corridor page can never show a number that disagrees with the pages
    that data originally came from. */
export async function getCorridorSnapshot(direction: Direction): Promise<CorridorSnapshot> {
  const [corridorStats, liquidity, rateIndex, timingRequests] = await Promise.all([
    buildCorridorStats(),
    getLiquidityIndexSnapshot(),
    getRateIndexSnapshot(),
    db.liquidityRequest.findMany({
      where: { direction },
      select: {
        createdAt: true,
        matches: {
          select: {
            createdAt: true,
            status: true,
            introductions: {
              select: { createdAt: true, updatedAt: true, respondedAt: true, status: true },
            },
          },
        },
      },
    }),
  ]);

  const label = directionLabel(direction);
  const demand = corridorStats.find((s) => s.directionLabel === label);
  const coverage = liquidity.corridors.find(
    (c) => c.label === DIRECTION_OPTIONS.find((d) => d.value === direction)?.label,
  );
  const rateEntry = rateIndex.entries.find((r) => r.direction === direction);
  const timing = computeTimingAverages(timingRequests);

  return {
    direction,
    slug: directionToSlug(direction),
    label,
    requestsLast14d: demand?.requestsLast14d ?? 0,
    requestsPrior14d: demand?.requestsPrior14d ?? 0,
    activePartners: demand?.activePartners ?? 0,
    banks: coverage?.banks ?? [],
    methods: coverage?.methods ?? [],
    rate: rateEntry
      ? { min: rateEntry.min, max: rateEntry.max, median: rateEntry.median, count: rateEntry.count, windowDays: rateIndex.windowDays }
      : null,
    timing: {
      avgHoursToFirstMatch: timing.avgHoursToFirstMatch,
      avgHoursToClose: timing.avgHoursToClose,
      sample: timing.sampleSizes.toMatch,
    },
  };
}
