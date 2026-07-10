import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { scoreMatch } from "@/lib/matching";

// Turns the deterministic scoring reasons (already computed for every
// suggestion) plus the free-text fields the scorer never reads into one
// natural-language paragraph — persisted on the Match so both operations
// and the company see the same explanation once generated, instead of
// operations reading a bullet list of overlap ratios.
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are writing a short, plain-English explanation of why a liquidity partner was matched to a company's request on INRP2P, a private INR liquidity matching platform. You are given the deterministic scoring reasons and both sides' free-text context. Write 2-3 sentences, specific (mention actual bands, coverage, capacity — not generic praise), and honest: if the fit is only partial in some dimension, say so plainly instead of glossing over it. This will be shown to both the operations team and the company, so do not include anything confidential-sounding or speculative. Do not invent facts not present in the input.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
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

  const facts = [
    `Score: ${score}/100`,
    `Scoring reasons: ${reasons.join("; ")}`,
    `Request — direction: ${match.request.direction}, daily volume: ${match.request.dailyVolumeBand}, monthly: ${match.request.monthlyVolumeBand}, required speed: ${match.request.requiredSpeed}, jurisdiction: ${match.request.jurisdiction}`,
    `Request banks: ${match.request.banks.join(", ") || "none listed"} · methods: ${match.request.methods.join(", ") || "none listed"}`,
    `Request preferred partner requirements: ${match.request.partnerRequirements ?? "none"}`,
    `Partner — ${match.partner.displayName}, status: ${match.partner.status}, daily capacity: ${match.partner.dailyCapacityBand}, working hours: ${match.partner.workingHours}, coverage: ${match.partner.jurisdictions}`,
    `Partner banks: ${match.partner.banks.join(", ") || "none listed"} · methods: ${match.partner.methods.join(", ") || "none listed"}`,
  ].join("\n");

  const text = await callClaude(SYSTEM_PROMPT, facts, 300);
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
