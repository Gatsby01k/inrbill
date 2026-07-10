import { NextResponse, type NextRequest } from "next/server";
import { runConciergeTurn, type CopilotTurn } from "@/lib/ai-agent";
import { parseConciergeResponse } from "@/lib/ai-prompts";
import { checkRateLimit } from "@/lib/redis";

// Public, unauthenticated — anyone on the landing page can hit this, so
// unlike every other AI route in this codebase there's no session to key
// the rate limit on. Keyed by IP instead (best-effort: shared IPs behind
// NAT/corporate proxies share a bucket, which is an acceptable tradeoff for
// "stop obvious abuse", not a precise per-visitor limit).
export const dynamic = "force-dynamic";

const MAX_TURNS = 20;

function isTurn(v: unknown): v is CopilotTurn {
  return (
    !!v &&
    typeof v === "object" &&
    ((v as CopilotTurn).role === "user" || (v as CopilotTurn).role === "assistant") &&
    typeof (v as CopilotTurn).text === "string" &&
    (v as CopilotTurn).text.length <= 2000
  );
}

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for on every request; take the first (client)
  // hop. Falls back to a shared bucket if headers are ever absent (local
  // dev, some proxies) — better to rate-limit everyone together than to
  // silently disable the limit entirely.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await checkRateLimit(`ratelimit:ai:concierge:${ip}`, 20, 60))) {
    return NextResponse.json(
      { type: "continue", reply: "Too many messages — please wait a moment and try again." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as { history?: unknown } | null;
  const history = Array.isArray(body?.history) ? body!.history.filter(isTurn) : [];
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ type: "continue", reply: "Say hello to get started." }, { status: 400 });
  }

  const trimmed = history.slice(-MAX_TURNS);
  const raw = await runConciergeTurn(trimmed);
  const result = parseConciergeResponse(raw);
  return NextResponse.json(result);
}
