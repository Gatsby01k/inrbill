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
