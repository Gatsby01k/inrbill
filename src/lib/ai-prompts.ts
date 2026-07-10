// Shared prompt text + fact-building for every AI feature that reasons
// about a LiquidityRequest or a Match — used by both the on-demand admin API
// routes (briefing, explain-match) and the automatic background triage
// pipeline (ai-triage.ts), so the two paths can never drift apart and
// produce inconsistent verdicts for the same request.

import type { LiquidityRequest, PartnerProfile } from "@prisma/client";
import { directionLabel, requestTypeLabel } from "@/lib/format";

/**
 * The triage prompt asks for a machine-readable first line (CLEAR or
 * FLAGGED) followed by the human-readable verdict — a lightweight
 * structured-output trick that avoids full JSON-mode/tool-use overhead for
 * a single boolean + a paragraph.
 */
export const TRIAGE_SYSTEM_PROMPT = `You are a compliance-aware operations assistant for INRP2P, a private INR liquidity matching platform, doing first-pass triage on a newly submitted request.

Your response MUST start with exactly one word on its own first line — CLEAR or FLAGGED — followed by a blank line, then your explanation.

Use FLAGGED if something in the notes genuinely suggests a risk or gap worth a human's attention (unusual jurisdictions, cash-heavy language, vague or evasive compliance answers, urgency mismatches, inconsistent or sloppily-entered details, missing context that matching would need). Use CLEAR otherwise.

After the marker line, write 2-3 sentences: a plain-English summary of what they need, and — only if FLAGGED — what specifically stood out. Be terse and factual. Do not give legal advice. Do not guarantee or endorse anything. Do not invent facts not present in the input.`;

type TriageRequest = Pick<
  LiquidityRequest,
  | "requestType"
  | "direction"
  | "dailyVolumeBand"
  | "monthlyVolumeBand"
  | "ticketSize"
  | "urgency"
  | "requiredSpeed"
  | "jurisdiction"
  | "countriesInvolved"
  | "kycReadiness"
  | "banks"
  | "methods"
  | "kycNotes"
  | "partnerRequirements"
  | "notes"
>;

export function buildTriageFacts(request: TriageRequest): string {
  return [
    `Request type: ${requestTypeLabel(request.requestType)}`,
    `Direction: ${directionLabel(request.direction)}`,
    `Daily volume: ${request.dailyVolumeBand} · Monthly: ${request.monthlyVolumeBand}`,
    `Ticket size: ${request.ticketSize ?? "not provided"}`,
    `Urgency: ${request.urgency} · Required speed: ${request.requiredSpeed}`,
    `Jurisdiction: ${request.jurisdiction} · Countries involved: ${request.countriesInvolved ?? "not provided"}`,
    `KYC/KYB readiness: ${request.kycReadiness}`,
    `Banks: ${request.banks.join(", ") || "none listed"}`,
    `Methods: ${request.methods.join(", ") || "none listed"}`,
    `Compliance/licensing notes: ${request.kycNotes ?? "none"}`,
    `Preferred partner requirements: ${request.partnerRequirements ?? "none"}`,
    `Company notes: ${request.notes ?? "none"}`,
  ].join("\n");
}

/** Splits a triage response into its parsed flag + the human-readable note.
    Falls back to treating the whole thing as the note (flagged, to be safe)
    if the model didn't follow the marker-line format. */
export function parseTriageResponse(raw: string): { flagged: boolean; note: string } {
  const lines = raw.split("\n");
  const marker = lines[0]?.trim().toUpperCase();
  if (marker === "CLEAR" || marker === "FLAGGED") {
    return { flagged: marker === "FLAGGED", note: lines.slice(1).join("\n").trim() || raw.trim() };
  }
  return { flagged: true, note: raw.trim() };
}

/**
 * Mirrors TRIAGE_SYSTEM_PROMPT above but for the other side of the
 * marketplace — a liquidity partner applying to join, instead of a company
 * submitting a request. Same marker-line contract, same parseTriageResponse
 * parser, so the two triage flows never drift apart in shape even though
 * the risk signals they're looking for are different (partner vetting cares
 * about track record and compliance posture, not deal-specific volume/speed
 * mismatches).
 */
export const PARTNER_TRIAGE_SYSTEM_PROMPT = `You are a compliance-aware operations assistant for INRP2P, a private INR liquidity matching platform, doing first-pass vetting on a newly submitted liquidity partner application.

Your response MUST start with exactly one word on its own first line — CLEAR or FLAGGED — followed by a blank line, then your explanation.

Use FLAGGED if something genuinely suggests a risk or gap worth a human's attention (vague or evasive compliance answers, inconsistent experience claims, thin or missing references, risk notes that understate real exposure, mismatched capacity vs experience band, unusual jurisdictions or operating countries for the claimed business). Use CLEAR otherwise — most applications with straightforward, consistent answers should be CLEAR.

After the marker line, write 2-3 sentences: a plain-English summary of who they are and what they offer, and — only if FLAGGED — what specifically stood out. Be terse and factual. Do not give legal advice. Do not guarantee or endorse anything. Do not invent facts not present in the input.`;

type TriagePartner = Pick<
  PartnerProfile,
  | "displayName"
  | "experienceBand"
  | "directions"
  | "banks"
  | "methods"
  | "dailyCapacityBand"
  | "monthlyCapacityBand"
  | "settlementPreference"
  | "workingHours"
  | "reserveBand"
  | "jurisdictions"
  | "operatingCountry"
  | "complianceFlags"
  | "complianceNotes"
  | "references"
  | "riskNotes"
  | "additionalComments"
>;

export function buildPartnerTriageFacts(partner: TriagePartner): string {
  return [
    `Display name: ${partner.displayName}`,
    `Experience band: ${partner.experienceBand}`,
    `Directions offered: ${partner.directions.join(", ") || "none listed"}`,
    `Banks: ${partner.banks.join(", ") || "none listed"}`,
    `Methods: ${partner.methods.join(", ") || "none listed"}`,
    `Daily capacity: ${partner.dailyCapacityBand} · Monthly: ${partner.monthlyCapacityBand ?? "not provided"}`,
    `Settlement preference: ${partner.settlementPreference ?? "not provided"} · Working hours: ${partner.workingHours}`,
    `Reserve band: ${partner.reserveBand}`,
    `Jurisdictions: ${partner.jurisdictions} · Operating country: ${partner.operatingCountry ?? "not provided"}`,
    `Compliance flags: ${partner.complianceFlags.join(", ") || "none listed"}`,
    `Compliance notes: ${partner.complianceNotes ?? "none"}`,
    `References: ${partner.references ?? "none"}`,
    `Risk notes: ${partner.riskNotes ?? "none"}`,
    `Additional comments: ${partner.additionalComments ?? "none"}`,
  ].join("\n");
}

export const MATCH_EXPLANATION_SYSTEM_PROMPT = `You are writing a short, plain-English explanation of why a liquidity partner was matched to a company's request on INRP2P, a private INR liquidity matching platform. You are given the deterministic scoring reasons and both sides' free-text context. Write 2-3 sentences, specific (mention actual bands, coverage, capacity — not generic praise), and honest: if the fit is only partial in some dimension, say so plainly instead of glossing over it. This will be shown to both the operations team and the company, so do not include anything confidential-sounding or speculative. Do not invent facts not present in the input.`;

type ExplainRequest = Pick<
  LiquidityRequest,
  "direction" | "dailyVolumeBand" | "monthlyVolumeBand" | "requiredSpeed" | "jurisdiction" | "banks" | "methods" | "partnerRequirements"
>;
type ExplainPartner = Pick<
  PartnerProfile,
  "displayName" | "status" | "dailyCapacityBand" | "workingHours" | "jurisdictions" | "banks" | "methods"
>;

export function buildMatchExplanationFacts(
  request: ExplainRequest,
  partner: ExplainPartner,
  score: number,
  reasons: string[],
): string {
  return [
    `Score: ${score}/100`,
    `Scoring reasons: ${reasons.join("; ")}`,
    `Request — direction: ${request.direction}, daily volume: ${request.dailyVolumeBand}, monthly: ${request.monthlyVolumeBand}, required speed: ${request.requiredSpeed}, jurisdiction: ${request.jurisdiction}`,
    `Request banks: ${request.banks.join(", ") || "none listed"} · methods: ${request.methods.join(", ") || "none listed"}`,
    `Request preferred partner requirements: ${request.partnerRequirements ?? "none"}`,
    `Partner — ${partner.displayName}, status: ${partner.status}, daily capacity: ${partner.dailyCapacityBand}, working hours: ${partner.workingHours}, coverage: ${partner.jurisdictions}`,
    `Partner banks: ${partner.banks.join(", ") || "none listed"} · methods: ${partner.methods.join(", ") || "none listed"}`,
  ].join("\n");
}
