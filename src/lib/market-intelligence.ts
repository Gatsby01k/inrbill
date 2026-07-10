// Deterministic corridor demand/supply aggregation — the arithmetic behind
// the AI market brief (src/app/api/admin/ai/market-brief/route.ts). Kept
// separate from the AI call itself so the numbers are independently
// trustworthy: an operator (or this file's own tests, if ever written) can
// verify the counts without touching the LLM at all.

import type { Direction } from "@prisma/client";
import { directionLabel } from "@/lib/format";
import { db } from "@/lib/db";
import type { CorridorStat } from "@/lib/ai-prompts";

const WINDOW_DAYS = 14;
const CORRIDORS: Direction[] = ["INR_TO_USDT", "USDT_TO_INR", "INR_PAYOUTS"];

/** Request volume for the trailing window vs the window before it, plus how
    many currently-active partners cover each corridor — everything the
    market brief prompt needs, computed with three flat queries. */
export async function buildCorridorStats(): Promise<CorridorStat[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now.getTime() - WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000);

  const [recent, prior, partners] = await Promise.all([
    db.liquidityRequest.groupBy({
      by: ["direction"],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    db.liquidityRequest.groupBy({
      by: ["direction"],
      where: { createdAt: { gte: priorStart, lt: windowStart } },
      _count: { _all: true },
    }),
    db.partnerProfile.findMany({
      where: { status: { in: ["VERIFIED", "LIMITED"] } },
      select: { directions: true },
    }),
  ]);

  return CORRIDORS.map((direction) => ({
    directionLabel: directionLabel(direction),
    requestsLast14d: recent.find((g) => g.direction === direction)?._count._all ?? 0,
    requestsPrior14d: prior.find((g) => g.direction === direction)?._count._all ?? 0,
    activePartners: partners.filter((p) => p.directions.includes(direction)).length,
  }));
}
