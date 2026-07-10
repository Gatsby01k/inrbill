import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude, isAiConfigured } from "@/lib/ai";
import { buildMarketBriefFacts, MARKET_BRIEF_SYSTEM_PROMPT } from "@/lib/ai-prompts";
import { buildCorridorStats } from "@/lib/market-intelligence";
import { checkRateLimit, redisGetJSON, redisSetJSON } from "@/lib/redis";

// Platform-wide, not tied to any one request/partner — so unlike the
// briefing routes, there's nothing to persist this onto. Cached in Redis
// for a few hours instead: the underlying numbers (14-day request/partner
// counts) don't meaningfully change minute to minute, so there's no reason
// to pay for a fresh LLM call every time someone opens the analytics page.
export const dynamic = "force-dynamic";

const CACHE_KEY = "ai:market-brief";
const CACHE_SECONDS = 6 * 60 * 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY unset)." }, { status: 200 });
  }

  const body = (await req.json().catch(() => null)) as { force?: boolean } | null;
  const force = body?.force === true;

  if (!force) {
    const cached = await redisGetJSON<{ text: string; stats: unknown; generatedAt: string }>(CACHE_KEY);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  if (!(await checkRateLimit(`ratelimit:ai:market-brief:${session.user.id}`, 10, 60))) {
    return NextResponse.json({ error: "Too many AI requests — wait a moment and try again." }, { status: 429 });
  }

  const stats = await buildCorridorStats();
  const raw = await callClaude(MARKET_BRIEF_SYSTEM_PROMPT, buildMarketBriefFacts(stats), 350);
  if (!raw) return NextResponse.json({ error: "AI call failed — check server logs." }, { status: 502 });

  const result = { text: raw.trim(), stats, generatedAt: new Date().toISOString() };
  await redisSetJSON(CACHE_KEY, result, CACHE_SECONDS);
  return NextResponse.json({ ...result, cached: false });
}
