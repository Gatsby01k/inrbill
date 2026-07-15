import type { CapacityPulse, Direction, LiquidityRequest, PartnerTier } from "@prisma/client";

export type RoutingCandidate = {
  partnerId: string;
  directions: Direction[];
  banks: string[];
  methods: string[];
  tier: PartnerTier;
  verificationApproved: boolean;
  incidentCount: number;
  capacity: CapacityPulse | null;
};

const tierScore: Record<PartnerTier, number> = { CANDIDATE: 0, VERIFIED: 10, STRATEGIC: 18, RESTRICTED: -30 };

export function rankCandidates(request: Pick<LiquidityRequest, "direction" | "banks" | "methods">, candidates: RoutingCandidate[], now = new Date()) {
  return candidates.flatMap((candidate) => {
    const capacity = candidate.capacity;
    if (!candidate.verificationApproved || !candidate.directions.includes(request.direction) || !capacity) return [];
    if (!['AVAILABLE', 'LIMITED'].includes(capacity.status) || capacity.availableUntil <= now || capacity.direction !== request.direction) return [];
    const bankMatches = request.banks.filter((bank) => candidate.banks.includes(bank) && capacity.banks.includes(bank)).length;
    const methodMatches = request.methods.filter((method) => candidate.methods.includes(method) && capacity.methods.includes(method)).length;
    const reasons = ["VERIFICATION_APPROVED", "LIVE_CAPACITY", "DIRECTION_MATCH"];
    if (bankMatches) reasons.push("BANK_MATCH");
    if (methodMatches) reasons.push("RAIL_MATCH");
    const score = Math.max(0, Math.min(100, 55 + tierScore[candidate.tier] + bankMatches * 5 + methodMatches * 5 - candidate.incidentCount * 12 - (capacity.status === "LIMITED" ? 8 : 0)));
    return [{ partnerId: candidate.partnerId, score, reasons }];
  }).sort((a, b) => b.score - a.score || a.partnerId.localeCompare(b.partnerId));
}
