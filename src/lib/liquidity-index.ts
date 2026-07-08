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

export async function getLiquidityIndexSnapshot(): Promise<LiquidityIndexSnapshot> {
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
}
