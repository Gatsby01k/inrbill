import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/redis";

// Drafts a suggested reply for whichever side is looking at a deal room —
// never sent automatically, just fills the composer so the user reviews and
// edits before sending. viewerSide is derived server-side from the session,
// never trusted from the client, so this can't be used to see or draft as
// the other side of a conversation you don't belong to.
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are drafting ONE short reply in an ongoing deal-room conversation between a company and a liquidity partner on INRP2P, a private INR liquidity matching platform. Write on behalf of the side indicated, continuing the conversation naturally given the thread so far and the deal context. Keep it under 80 words, professional, no filler greeting or sign-off unless the conversation's tone calls for one. Do not invent facts, numbers, or commitments not already present in the thread or context. Output only the reply text, nothing else.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
  }
  if (!(await checkRateLimit(`ratelimit:ai:reply-draft:${session.user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Too many AI requests — wait a moment and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { introductionId?: string } | null;
  const introductionId = body?.introductionId;
  if (!introductionId) return NextResponse.json({ error: "Missing introductionId." }, { status: 400 });

  const intro = await db.introduction.findUnique({
    where: { id: introductionId },
    include: {
      match: {
        include: {
          request: { include: { company: true } },
          partner: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
    },
  });
  if (!intro) return NextResponse.json({ error: "Introduction not found." }, { status: 404 });

  // Derive the viewer's side strictly from the session — never trust a
  // client-supplied side for whose voice to write in or whether they may
  // see this thread at all.
  let viewerSide: "COMPANY" | "PARTNER" | "INTERNAL";
  if (session.user.role === "ADMIN") {
    viewerSide = "INTERNAL";
  } else if (session.user.role === "COMPANY" && session.user.company?.id === intro.match.request.companyId) {
    viewerSide = "COMPANY";
  } else if (session.user.role === "PARTNER" && session.user.partner?.id === intro.match.partnerId) {
    viewerSide = "PARTNER";
  } else {
    return NextResponse.json({ error: "Not part of this conversation." }, { status: 403 });
  }

  const thread = intro.messages.length
    ? intro.messages.map((m) => `${m.authorLabel} (${m.authorSide}): ${m.body}`).join("\n")
    : "(no messages yet — this would be the opening message)";

  const facts = [
    `You are drafting on behalf of: ${viewerSide}`,
    `Request: ${intro.match.request.reference}, ${intro.match.request.direction}, ${intro.match.request.dailyVolumeBand} daily / ${intro.match.request.monthlyVolumeBand} monthly, ${intro.match.request.requiredSpeed} settlement`,
    `Company: ${intro.match.request.company.companyName}`,
    `Partner: ${intro.match.partner.displayName}, ${intro.match.partner.dailyCapacityBand} capacity, ${intro.match.partner.workingHours}`,
    `Introduction summary: ${intro.summary ?? "none"}`,
    `Thread so far:\n${thread}`,
  ].join("\n");

  const text = await callClaude(SYSTEM_PROMPT, facts, 220);
  if (!text) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });
  return NextResponse.json({ text });
}
