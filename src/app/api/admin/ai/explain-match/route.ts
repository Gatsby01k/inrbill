import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { buildMatchExplanationFacts, MATCH_EXPLANATION_SYSTEM_PROMPT } from "@/lib/ai-prompts";
import { db } from "@/lib/db";
import { scoreMatch } from "@/lib/matching";
import { checkRateLimit } from "@/lib/redis";

// Manual "Explain in plain English" / "Regenerate explanation" — same
// prompt the background pipeline uses to auto-explain the top auto-suggested
// matches right after submission (see autoExplainTopMatches in
// src/lib/ai-triage.ts). This route is what a human clicks to (re)do it for
// any match, top-scoring or not.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
  }
  if (!(await checkRateLimit(`ratelimit:ai:explain-match:${session.user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Too many AI requests — wait a moment and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { matchId?: string } | null;
  const matchId = body?.matchId;
  if (!matchId) return NextResponse.json({ error: "Missing matchId." }, { status: 400 });

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { request: true, partner: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const { score, reasons } = scoreMatch(match.request, match.partner);
  const facts = buildMatchExplanationFacts(match.request, match.partner, score, reasons);

  const text = await callClaude(MATCH_EXPLANATION_SYSTEM_PROMPT, facts, 300);
  if (!text) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });

  await db.match.update({ where: { id: matchId }, data: { aiExplanation: text } });
  await audit({
    action: "match.ai_explanation_generated",
    entityType: "Match",
    entityId: matchId,
    actorId: session.user.id,
    actorLabel: "Operator",
    requestId: match.requestId,
    partnerId: match.partnerId,
    matchId,
    meta: { score },
  });

  return NextResponse.json({ text });
}
