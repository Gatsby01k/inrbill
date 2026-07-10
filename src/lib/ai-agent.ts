// Agentic loop for the admin AI copilot — the one genuinely "agent" feature
// among the AI additions (the others are single-shot completions). Claude is
// given the read-only tool set from ai-tools.ts and decides for itself which
// to call; we execute them and feed results back until it produces a final
// answer. Same raw-fetch approach as ai.ts, no SDK installed.

import { AI_TOOLS, runAiTool } from "@/lib/ai-tools";
import { CONCIERGE_SYSTEM_PROMPT } from "@/lib/ai-prompts";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOOL_ROUNDS = 4;

const SYSTEM_PROMPT = `You are the internal operations copilot for INRP2P, a private INR liquidity matching platform. Answer the operator's questions using ONLY the tools provided — never invent numbers, references, or facts. If a tool returns no data or an error, say so plainly instead of guessing. Lead with the direct answer, cite specific numbers and references, and keep answers concise (well under 150 words) unless the question genuinely calls for a list. You cannot take any action — every tool is read-only, nothing you do writes to the database — so never imply that you changed, approved, or sent anything.`;

export type CopilotTurn = { role: "user" | "assistant"; text: string };

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

export async function runCopilotTurn(
  history: CopilotTurn[],
): Promise<{ text: string; toolsUsed: string[] }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: "AI is not configured (ANTHROPIC_API_KEY unset).", toolsUsed: [] };

  // Built fresh each call — prior turns are plain resolved text (no
  // tool_use blocks carried across requests). Tool calls happen live only
  // for the newest user turn, keeping the request payload simple.
  const messages: { role: "user" | "assistant"; content: unknown }[] = history.map((h) => ({
    role: h.role,
    content: h.text,
  }));
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          tools: AI_TOOLS,
          messages,
        }),
      });
    } catch (err) {
      console.error("Copilot call failed", err);
      return { text: "AI call failed — check server logs.", toolsUsed };
    }

    if (!res.ok) {
      console.error("Copilot call failed", res.status, await res.text());
      return { text: "AI call failed — check server logs.", toolsUsed };
    }

    const data = (await res.json()) as { content: AnthropicContentBlock[]; stop_reason: string };

    if (data.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: data.content });
      const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
      for (const block of data.content) {
        if (block.type !== "tool_use") continue;
        toolsUsed.push(block.name);
        let result: unknown;
        try {
          result = await runAiTool(block.name, block.input);
        } catch (err) {
          result = { error: String(err) };
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const textBlock = data.content.find((c): c is { type: "text"; text: string } => c.type === "text");
    return { text: textBlock?.text.trim() ?? "No answer produced.", toolsUsed };
  }

  return { text: "Reached the tool-call limit without a final answer — try a narrower question.", toolsUsed };
}

/**
 * Public landing-page concierge — multi-turn like runCopilotTurn above, but
 * deliberately simpler: no tools, no agentic loop, just one Claude call per
 * visitor turn using CONCIERGE_SYSTEM_PROMPT's CONTINUE/READY marker
 * contract (src/lib/ai-prompts.ts). Kept as its own function rather than a
 * generic "tools optional" parameter on runCopilotTurn because the two have
 * meaningfully different trust boundaries — this one talks to anonymous
 * public traffic, that one is admin-only — and keeping them syntactically
 * separate makes that boundary harder to accidentally blur later.
 */
export async function runConciergeTurn(history: CopilotTurn[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return "CONTINUE\n\nChat isn't available right now — please use the contact links below instead.";
  }

  const messages = history.map((h) => ({ role: h.role, content: h.text }));

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 400,
        system: CONCIERGE_SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok) {
      console.error("Concierge call failed", res.status, await res.text());
      return "CONTINUE\n\nSomething went wrong on our end — please try again in a moment.";
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const block = data.content?.find((c) => c.type === "text" && typeof c.text === "string");
    return block?.text?.trim() || "CONTINUE\n\nCould you say that again?";
  } catch (err) {
    console.error("Concierge call failed", err);
    return "CONTINUE\n\nSomething went wrong on our end — please try again in a moment.";
  }
}
