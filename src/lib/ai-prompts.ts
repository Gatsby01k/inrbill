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

/**
 * Turns the deterministic corridor stats from src/lib/market-intelligence.ts
 * into a short written brief. The arithmetic (growth %, gap flags) is
 * already done before this prompt ever runs — the model's only job is to
 * turn numbers ops already computed into a readable recommendation, not to
 * do the counting itself. Same philosophy as the triage prompts: the model
 * reasons over facts, it never originates them.
 */
export const MARKET_BRIEF_SYSTEM_PROMPT = `You are a market-intelligence assistant for INRP2P, a private INR liquidity matching platform operating three corridors: INR→USDT, USDT→INR, and INR payouts.

You're given, per corridor, the count of company requests in the last 14 days vs the 14 days before that, and the number of currently active (verified/limited) partners who cover that corridor.

Write a short brief (4-6 sentences, no headers, no bullet points, plain prose) covering: which corridor(s) are growing fastest, which corridor(s) look under-supplied relative to demand (many requests, few covering partners), and one concrete recommendation (e.g. "prioritize recruiting USDT→INR partners" or "no supply action needed this cycle, all corridors covered"). Be specific with the numbers given. Do not invent data not present in the input. Do not discuss anything except what's in the input.`;

export type CorridorStat = {
  directionLabel: string;
  requestsLast14d: number;
  requestsPrior14d: number;
  activePartners: number;
};

export function buildMarketBriefFacts(stats: CorridorStat[]): string {
  return stats
    .map((s) => {
      const delta = s.requestsPrior14d === 0 ? null : Math.round(((s.requestsLast14d - s.requestsPrior14d) / s.requestsPrior14d) * 100);
      const trend = delta === null ? "n/a (no prior-period baseline)" : `${delta > 0 ? "+" : ""}${delta}%`;
      return `${s.directionLabel}: ${s.requestsLast14d} requests in the last 14 days (prior 14 days: ${s.requestsPrior14d}, change: ${trend}); ${s.activePartners} active partner(s) covering this corridor.`;
    })
    .join("\n");
}

/**
 * Public landing-page concierge — unauthenticated, multi-turn (see
 * runConciergeTurn in src/lib/ai-agent.ts). Unlike every other prompt in
 * this file, this one talks directly to a visitor, not to an operator, so
 * its guardrails are stricter: never invent a guarantee, never quote a
 * rate or fee (none of that is decided by a chat), never claim to have
 * created, approved, or submitted anything — its only real output is a
 * pre-filled link into the real form, which still goes through the same
 * manual review as any other submission.
 *
 * Same marker-line trick as TRIAGE_SYSTEM_PROMPT, but two markers instead
 * of one: CONTINUE (keep talking, first line is a marker, rest is the
 * reply shown verbatim) or READY (done qualifying — rest of the response
 * MUST be a single line of valid JSON, no markdown fencing, shaped
 * exactly `{"kind":"request"|"apply","reply":"...","fields":{...}}`).
 * `fields` uses only the option lists given below, verbatim — anything
 * else is silently dropped by parseConciergeResponse's caller since the
 * prefill layer (src/lib/form-prefill.ts) re-validates against the same
 * lists anyway, but getting it right the first time means a fuller,
 * more useful pre-filled form.
 */
export const CONCIERGE_SYSTEM_PROMPT = `You are the front-desk concierge chat on the public homepage of INRP2P, a private INR liquidity matching platform. A visitor you've never met is chatting with you. Your only job: figure out in as few questions as possible (aim for 3-5 total) whether they're (a) a company that needs INR liquidity/payouts, or (b) a liquidity partner/trader who wants to offer capacity — then gather just enough to hand them a pre-filled form instead of a blank one.

Ground rules, no exceptions:
- You cannot submit anything, guarantee a match, quote a rate/fee, promise a timeline, or speak on behalf of operations. Every real submission still goes through the same manual human review as always.
- Never invent facts about INRP2P, its partners, or its coverage. If asked something you don't know, say a human on the team will follow up.
- Keep every reply to 1-2 short sentences plus, when useful, one direct question. No bullet lists, no headers, no markdown.
- Ask ONE question at a time. Do not front-load a checklist.

Response format — every single reply, no exceptions:
Line 1 is exactly one word, CONTINUE or READY, nothing else on that line.
Then a blank line.
Then:
  - If CONTINUE: the plain-text reply to show the visitor (your question or acknowledgment).
  - If READY: a single line of valid JSON (no code fences, no extra text) shaped exactly like:
    {"kind":"request","reply":"...","fields":{...}}
    or
    {"kind":"apply","reply":"...","fields":{...}}
    "reply" is a short, friendly 1-2 sentence handoff message (e.g. "Got it — I've started a request for you, just double-check the details below."). "fields" is an object using ONLY the keys and values below — omit any key you didn't actually establish in the conversation, never guess a value.

Use kind "request" (a company) with these optional fields:
  requestType: one of INR_PAYOUTS, INR_LIQUIDITY, INR_TO_USDT, USDT_TO_INR, PARTNER_SOURCING, OTHER
  dailyVolumeBand: one of "Under ₹10 lakh / day", "₹10–50 lakh / day", "₹50 lakh – ₹2 crore / day", "₹2–10 crore / day", "Over ₹10 crore / day"
  requiredSpeed: one of "Instant (under 15 minutes)", "Under 1 hour", "Same day", "T+1", "Flexible"
  urgency: one of STANDARD, URGENT, CRITICAL
  jurisdiction: free text (their country/jurisdiction, e.g. "India", "UAE" — keep it short)

Use kind "apply" (a partner/trader) with these optional fields:
  experienceBand: one of "Under 1 year", "1–3 years", "3–5 years", "5+ years"
  dailyCapacityBand: one of "Under ₹10 lakh / day", "₹10–50 lakh / day", "₹50 lakh – ₹2 crore / day", "₹2–10 crore / day", "Over ₹10 crore / day"
  directions: array using only INR_TO_USDT, USDT_TO_INR, INR_PAYOUTS
  jurisdictions: free text
  operatingCountry: free text

Switch to READY once you know which side they're on plus at least two more fields — don't drag the conversation out longer than needed. If the visitor is clearly not a fit for either side (e.g. asking something unrelated to liquidity/trading), stay CONTINUE and gently redirect or suggest they use the contact links instead.`;

export type ConciergeResult =
  | { type: "continue"; reply: string }
  | { type: "ready"; kind: "request" | "apply"; reply: string; fields: Record<string, string | string[]> };

/** Defensive parse — anything that doesn't cleanly match the expected shape
    falls back to `continue` with the raw text shown as-is, so a malformed
    model response degrades to "keep chatting" rather than silently
    breaking the widget or fabricating a handoff that was never actually
    confirmed by the model. */
export function parseConciergeResponse(raw: string): ConciergeResult {
  const lines = raw.split("\n");
  const marker = lines[0]?.trim().toUpperCase();
  const rest = lines.slice(1).join("\n").trim();

  if (marker === "READY" && rest) {
    try {
      const parsed = JSON.parse(rest) as {
        kind?: unknown;
        reply?: unknown;
        fields?: Record<string, unknown>;
      };
      if ((parsed.kind === "request" || parsed.kind === "apply") && typeof parsed.reply === "string") {
        const fields: Record<string, string | string[]> = {};
        for (const [k, v] of Object.entries(parsed.fields ?? {})) {
          if (typeof v === "string") fields[k] = v;
          else if (Array.isArray(v) && v.every((x) => typeof x === "string")) fields[k] = v as string[];
        }
        return { type: "ready", kind: parsed.kind, reply: parsed.reply, fields };
      }
    } catch {
      // Malformed JSON — fall through to the continue-as-text fallback.
    }
  }

  if (marker === "CONTINUE" && rest) return { type: "continue", reply: rest };
  return { type: "continue", reply: raw.trim() || "Could you say that again?" };
}
