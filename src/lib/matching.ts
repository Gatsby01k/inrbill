// Algorithmic partner-fit scoring for the matching workflow.
//
// This never creates or releases a match on its own — it only ranks the
// already-eligible (VERIFIED/LIMITED, correct direction) partner pool so an
// operator can see the strongest candidates first instead of reading down an
// alphabetical list. Every score comes with plain-language reasons so the
// suggestion is auditable, not a black box — consistent with how the rest of
// the network is positioned.

import type { LiquidityRequest, PartnerProfile } from "@prisma/client";
import { COMPLIANCE_FLAG_OPTIONS, DAILY_VOLUME_BANDS } from "@/lib/options";

export type MatchSuggestion = {
  partner: PartnerProfile;
  score: number;
  reasons: string[];
};

type ScorableRequest = Pick<
  LiquidityRequest,
  "banks" | "methods" | "dailyVolumeBand" | "jurisdiction" | "countriesInvolved"
>;

type ScorablePartner = Pick<
  PartnerProfile,
  "banks" | "methods" | "dailyCapacityBand" | "status" | "jurisdictions" | "operatingCountry" | "complianceFlags"
>;

const WEIGHTS = {
  banks: 25,
  methods: 15,
  capacity: 20,
  status: 15,
  jurisdiction: 15,
  compliance: 10,
} as const;

function overlapRatio(need: readonly string[], have: readonly string[]): number {
  if (need.length === 0) return 1;
  const haveSet = new Set(have.map((x) => x.toLowerCase()));
  const matched = need.filter(
    (n) => haveSet.has(n.toLowerCase()) || haveSet.has("other / any"),
  ).length;
  return matched / need.length;
}

/** Ordinal proximity between two DAILY_VOLUME_BANDS-style strings.
    A partner whose typical capacity meets or exceeds the request scores
    near 1; a partner well below the need is penalised per band short. */
function bandProximity(requestBand: string, partnerBand: string): number {
  const bands: readonly string[] = DAILY_VOLUME_BANDS;
  const ri = bands.indexOf(requestBand);
  const pi = bands.indexOf(partnerBand);
  if (ri === -1 || pi === -1) return 0.5;
  if (pi >= ri) {
    const over = pi - ri;
    return over === 0 ? 1 : Math.max(0.7, 1 - over * 0.1);
  }
  const short = ri - pi;
  return Math.max(0, 1 - short * 0.35);
}

function jurisdictionOverlap(request: ScorableRequest, partner: ScorablePartner): number {
  const reqText = `${request.jurisdiction} ${request.countriesInvolved ?? ""}`.toLowerCase();
  const ptrText = `${partner.jurisdictions} ${partner.operatingCountry ?? ""}`.toLowerCase();
  const reqTokens = reqText.split(/[,\s/]+/).filter((t) => t.length > 2);
  if (reqTokens.length === 0 || !ptrText.trim()) return 0.5;
  const hit = reqTokens.filter((t) => ptrText.includes(t)).length;
  return Math.min(1, hit / reqTokens.length);
}

export function scoreMatch(request: ScorableRequest, partner: ScorablePartner): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const bankRatio = overlapRatio(request.banks, partner.banks);
  const bankHit = Math.round(bankRatio * request.banks.length);
  reasons.push(
    request.banks.length
      ? `${bankHit}/${request.banks.length} required banks covered`
      : "No specific banks required",
  );

  const methodRatio = overlapRatio(request.methods, partner.methods);
  const methodHit = Math.round(methodRatio * request.methods.length);
  reasons.push(
    request.methods.length
      ? `${methodHit}/${request.methods.length} required rails covered`
      : "No specific rails required",
  );

  const capacityRatio = bandProximity(request.dailyVolumeBand, partner.dailyCapacityBand);
  reasons.push(
    capacityRatio >= 0.9
      ? "Capacity comfortably covers the request"
      : capacityRatio >= 0.6
        ? "Capacity roughly matches the request"
        : "Capacity may fall short of the request",
  );

  const statusRatio = partner.status === "VERIFIED" ? 1 : partner.status === "LIMITED" ? 0.5 : 0;
  reasons.push(partner.status === "VERIFIED" ? "Fully verified partner" : "Limited verification — read the caveats");

  const jurisdictionRatio = jurisdictionOverlap(request, partner);
  reasons.push(
    jurisdictionRatio >= 0.6
      ? "Jurisdiction / coverage aligns with the request"
      : "Jurisdiction overlap unclear from declared coverage",
  );

  const complianceRatio = Math.min(1, partner.complianceFlags.length / COMPLIANCE_FLAG_OPTIONS.length);
  reasons.push(`${partner.complianceFlags.length}/${COMPLIANCE_FLAG_OPTIONS.length} compliance signals on file`);

  const score =
    bankRatio * WEIGHTS.banks +
    methodRatio * WEIGHTS.methods +
    capacityRatio * WEIGHTS.capacity +
    statusRatio * WEIGHTS.status +
    jurisdictionRatio * WEIGHTS.jurisdiction +
    complianceRatio * WEIGHTS.compliance;

  return { score: Math.round(score), reasons };
}

type DraftableRequest = Pick<
  LiquidityRequest,
  "direction" | "dailyVolumeBand" | "monthlyVolumeBand" | "requiredSpeed" | "banks" | "methods"
>;
type DraftablePartner = Pick<
  PartnerProfile,
  "displayName" | "dailyCapacityBand" | "workingHours" | "banks" | "methods"
>;

/**
 * Turns the request + partner facts already on file into a ready-to-send
 * introduction summary — the operator reviews/edits instead of writing one
 * from a blank textarea every time. Used by the one-click "Approve &
 * introduce" action and as the default text in the manual introduction form.
 */
export function draftIntroductionSummary(request: DraftableRequest, partner: DraftablePartner): string {
  const directionText = request.direction.replace(/_/g, " ").toLowerCase();
  return (
    `Introducing ${partner.displayName} for a ${directionText} requirement ` +
    `(${request.dailyVolumeBand} daily / ${request.monthlyVolumeBand} monthly, ${request.requiredSpeed} settlement). ` +
    `Partner covers ${partner.banks.slice(0, 4).join(", ") || "the required banks"} via ` +
    `${partner.methods.slice(0, 4).join(", ") || "the required rails"}, ${partner.dailyCapacityBand} daily capacity, ` +
    `${partner.workingHours}.`
  );
}

/** Rank a pool of already-eligible partners against a request, best first. */
export function rankPartners(
  request: ScorableRequest,
  partners: PartnerProfile[],
  limit = 5,
): MatchSuggestion[] {
  return partners
    .map((partner) => {
      const { score, reasons } = scoreMatch(request, partner);
      return { partner, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
