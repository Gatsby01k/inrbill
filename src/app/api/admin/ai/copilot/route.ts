import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { runCopilotTurn, type CopilotTurn } from "@/lib/ai-agent";
import { checkRateLimit } from "@/lib/redis";

// Admin-only AI ops copilot — natural-language questions answered against
// live platform data via read-only tool calls (see src/lib/ai-tools.ts).
// Session-gated directly (not requireRole) so an expired session returns a
// clean 401 for the client fetch instead of a redirect response.
export const dynamic = "force-dynamic";

function isTurn(v: unknown): v is CopilotTurn {
  return (
    !!v &&
    typeof v === "object" &&
    ((v as CopilotTurn).role === "user" || (v as CopilotTurn).role === "assistant") &&
    typeof (v as CopilotTurn).text === "string"
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Lower ceiling than the single-shot AI routes — each turn here can chain
  // up to MAX_TOOL_ROUNDS model calls, so it costs more per request.
  if (!(await checkRateLimit(`ratelimit:ai:copilot:${session.user.id}`, 12, 60))) {
    return NextResponse.json({ error: "Too many questions — wait a moment and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { history?: unknown } | null;
  const history = Array.isArray(body?.history) ? body!.history.filter(isTurn) : [];
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Missing user message." }, { status: 400 });
  }

  // Cap how much conversation we forward — bounds both cost and prompt size.
  const trimmed = history.slice(-20);
  const { text, toolsUsed } = await runCopilotTurn(trimmed);
  return NextResponse.json({ text, toolsUsed });
}
