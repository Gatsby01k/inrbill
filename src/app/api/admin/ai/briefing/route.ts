import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { directionLabel, requestTypeLabel } from "@/lib/format";
import { checkRateLimit } from "@/lib/redis";

// On-demand AI briefing for an admin reviewing a request — turns the free-text
// fields (kycNotes, partnerRequirements, notes) that the deterministic
// matching score never reads into a short summary plus any risk flags worth
// a second look. Nothing here is persisted — generated live, on click, so it
// always reflects the latest notes.
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a compliance-aware operations assistant for INRP2P, a private INR liquidity matching platform. Given a company's liquidity request, write:
1. A 2-3 sentence plain-English summary of what they need and their context.
2. A short list of risk or compliance flags worth a second look — ONLY if something in the notes actually suggests one (unusual jurisdictions, cash-heavy language, vague or evasive compliance answers, urgency mismatches, inconsistent details). If nothing stands out, say plainly "No flags stood out from the notes provided."
Be terse and factual. Do not give legal advice. Do not guarantee or endorse anything. Do not invent facts not present in the input.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
  }
  if (!(await checkRateLimit(`ratelimit:ai:briefing:${session.user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Too many AI requests — wait a moment and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { requestId?: string } | null;
  const requestId = body?.requestId;
  if (!requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const request = await db.liquidityRequest.findUnique({ where: { id: requestId } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const facts = [
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

  const text = await callClaude(SYSTEM_PROMPT, facts, 350);
  if (!text) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });
  return NextResponse.json({ text });
}
