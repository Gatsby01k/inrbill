import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { buildTriageFacts, TRIAGE_SYSTEM_PROMPT, parseTriageResponse } from "@/lib/ai-prompts";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/redis";

// Manual "Regenerate" for the AI briefing — same triage prompt the
// background pipeline runs automatically right after submission (see
// src/lib/ai-triage.ts). Persists back onto the request so a manual
// regenerate updates the same verdict everyone else sees, not a separate
// ephemeral copy.
export const dynamic = "force-dynamic";

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

  const raw = await callClaude(TRIAGE_SYSTEM_PROMPT, buildTriageFacts(request), 350);
  if (!raw) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });

  const { flagged, note } = parseTriageResponse(raw);
  await db.liquidityRequest.update({ where: { id: requestId }, data: { aiTriageNote: note, aiFlagged: flagged } });

  return NextResponse.json({ text: note, flagged });
}
