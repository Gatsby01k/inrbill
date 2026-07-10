import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { buildPartnerTriageFacts, PARTNER_TRIAGE_SYSTEM_PROMPT, parseTriageResponse } from "@/lib/ai-prompts";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/redis";

// Manual "Regenerate" for a partner application's AI vetting note — same
// prompt the background pipeline runs automatically right after a partner
// applies (see runPartnerTriage in src/lib/ai-triage.ts). Persists back onto
// the partner so a manual regenerate updates the same verdict everyone else
// sees, not a separate ephemeral copy. Mirrors /api/admin/ai/briefing for
// LiquidityRequest — kept as a separate route (rather than one branching
// route) so each stays a simple, single-purpose handler.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
  }
  if (!(await checkRateLimit(`ratelimit:ai:partner-briefing:${session.user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Too many AI requests — wait a moment and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { partnerId?: string } | null;
  const partnerId = body?.partnerId;
  if (!partnerId) return NextResponse.json({ error: "Missing partnerId." }, { status: 400 });

  const partner = await db.partnerProfile.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

  const raw = await callClaude(PARTNER_TRIAGE_SYSTEM_PROMPT, buildPartnerTriageFacts(partner), 350);
  if (!raw) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });

  const { flagged, note } = parseTriageResponse(raw);
  await db.partnerProfile.update({ where: { id: partnerId }, data: { aiTriageNote: note, aiFlagged: flagged } });

  return NextResponse.json({ text: note, flagged });
}
