// Automatic AI pre-flight pipeline — runs right after a request is
// submitted (see submitCompanyRequest in src/app/actions/public.ts, wired
// via next/server's after() so it never delays the company's own redirect).
//
// Three steps, each independently fail-soft (never throws, logs and moves
// on): triage the request itself, auto-explain the strongest auto-suggested
// matches, and — if the request comes out clean with a strong match — ping
// ops that this one's ready to fast-track instead of waiting for someone to
// notice. The goal is that by the time an operator opens their queue, the
// easy majority of requests already have everything they need attached;
// human attention concentrates on the ones actually flagged.

import { audit } from "@/lib/audit";
import { callClaude, isAiConfigured } from "@/lib/ai";
import {
  buildMatchExplanationFacts,
  buildPartnerTriageFacts,
  buildTriageFacts,
  MATCH_EXPLANATION_SYSTEM_PROMPT,
  parseTriageResponse,
  PARTNER_TRIAGE_SYSTEM_PROMPT,
  TRIAGE_SYSTEM_PROMPT,
} from "@/lib/ai-prompts";
import { db } from "@/lib/db";
import { scoreMatch } from "@/lib/matching";
import { sendTelegramAlert } from "@/lib/telegram";

const AUTO_EXPLAIN_MIN_SCORE = 60;
const AUTO_EXPLAIN_MAX_MATCHES = 2;
const FAST_TRACK_MIN_SCORE = 80;

async function runRequestTriage(requestId: string): Promise<void> {
  try {
    const request = await db.liquidityRequest.findUnique({ where: { id: requestId } });
    if (!request) return;

    const raw = await callClaude(TRIAGE_SYSTEM_PROMPT, buildTriageFacts(request), 350);
    if (!raw) return;

    const { flagged, note } = parseTriageResponse(raw);
    await db.liquidityRequest.update({ where: { id: requestId }, data: { aiTriageNote: note, aiFlagged: flagged } });
    await audit({
      action: "request.ai_triaged",
      entityType: "LiquidityRequest",
      entityId: requestId,
      actorLabel: "AI Triage",
      requestId,
      meta: { flagged, auto: true },
    });
  } catch (err) {
    console.error("runRequestTriage failed", err);
  }
}

async function autoExplainTopMatches(requestId: string): Promise<void> {
  try {
    const candidates = await db.match.findMany({
      where: { requestId, status: "SUGGESTED", aiExplanation: null },
      include: { request: true, partner: true },
      orderBy: { confidenceScore: "desc" },
      take: AUTO_EXPLAIN_MAX_MATCHES,
    });

    for (const m of candidates) {
      if ((m.confidenceScore ?? 0) < AUTO_EXPLAIN_MIN_SCORE) continue;
      try {
        const { score, reasons } = scoreMatch(m.request, m.partner);
        const facts = buildMatchExplanationFacts(m.request, m.partner, score, reasons);
        const text = await callClaude(MATCH_EXPLANATION_SYSTEM_PROMPT, facts, 300);
        if (!text) continue;
        await db.match.update({ where: { id: m.id }, data: { aiExplanation: text } });
        await audit({
          action: "match.ai_explanation_generated",
          entityType: "Match",
          entityId: m.id,
          actorLabel: "AI Triage",
          requestId: m.requestId,
          partnerId: m.partnerId,
          matchId: m.id,
          meta: { score, auto: true },
        });
      } catch (err) {
        console.error("autoExplainTopMatches: failed for one match", err);
      }
    }
  } catch (err) {
    console.error("autoExplainTopMatches failed", err);
  }
}

async function notifyIfFastTrackable(requestId: string): Promise<void> {
  try {
    const request = await db.liquidityRequest.findUnique({
      where: { id: requestId },
      select: {
        reference: true,
        aiFlagged: true,
        matches: { orderBy: { confidenceScore: "desc" }, take: 1, select: { confidenceScore: true } },
      },
    });
    if (!request || request.aiFlagged) return;
    const topScore = request.matches[0]?.confidenceScore ?? 0;
    if (topScore < FAST_TRACK_MIN_SCORE) return;

    await sendTelegramAlert(
      `⚡ <b>Ready to fast-track</b>\n${request.reference} — top match scored ${topScore}/100, no AI flags. Approve & introduce is one click away.`,
    );
  } catch (err) {
    console.error("notifyIfFastTrackable failed", err);
  }
}

/** Entry point — call once, right after a request (and its auto-suggested
    matches) exist. Every step degrades gracefully; if AI isn't configured
    this is a no-op, and normal manual review still works exactly as before. */
export async function runFullTriagePipeline(requestId: string): Promise<void> {
  if (!isAiConfigured()) return;
  await runRequestTriage(requestId);
  await autoExplainTopMatches(requestId);
  await notifyIfFastTrackable(requestId);
}

// ── Partner-application side ──────────────────────────────────────────────
// Same shape as the request pipeline above, mirrored for the other side of
// the marketplace. There's no "matches" or "fast-track" concept for a fresh
// partner application, so this is just the one triage step — but it reuses
// the exact same prompt contract, parser, and persistence pattern so the two
// pipelines can't drift apart.

async function runPartnerTriage(partnerId: string): Promise<void> {
  try {
    const partner = await db.partnerProfile.findUnique({ where: { id: partnerId } });
    if (!partner) return;

    const raw = await callClaude(PARTNER_TRIAGE_SYSTEM_PROMPT, buildPartnerTriageFacts(partner), 350);
    if (!raw) return;

    const { flagged, note } = parseTriageResponse(raw);
    await db.partnerProfile.update({ where: { id: partnerId }, data: { aiTriageNote: note, aiFlagged: flagged } });
    await audit({
      action: "partner.ai_triaged",
      entityType: "PartnerProfile",
      entityId: partnerId,
      actorLabel: "AI Triage",
      partnerId,
      meta: { flagged, auto: true },
    });

    if (flagged) {
      await sendTelegramAlert(
        `🚩 <b>Partner application flagged</b>\n${partner.reference} — ${partner.displayName}. Worth a second look before verifying.`,
      );
    }
  } catch (err) {
    console.error("runPartnerTriage failed", err);
  }
}

/** Entry point — call once, right after a partner application exists.
    Degrades gracefully; if AI isn't configured this is a no-op and normal
    manual review still works exactly as before. */
export async function runPartnerTriagePipeline(partnerId: string): Promise<void> {
  if (!isAiConfigured()) return;
  await runPartnerTriage(partnerId);
}
