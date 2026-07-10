// Thin Claude (Anthropic Messages API) wrapper — plain fetch(), no SDK
// install, same shape as telegram.ts/razorpay.ts/nowpayments.ts: fail-soft
// (returns null, never throws) so every caller degrades to "AI not
// available" instead of breaking the page when the key isn't set or the
// call errors out.
//
// Setup: create a key at https://console.anthropic.com, set
// ANTHROPIC_API_KEY. Optionally override ANTHROPIC_MODEL — check
// https://docs.claude.com/en/docs/about-claude/models for the current
// recommended model id if the default below has since been superseded.

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * One-shot text completion: a system instruction + a single user turn, no
 * conversation state. Every feature built on this (briefings, match
 * explanations, reply drafts) is a single call — nothing here streams or
 * holds multi-turn history.
 */
export async function callClaude(
  system: string,
  user: string,
  maxTokens = 500,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("Claude call skipped — ANTHROPIC_API_KEY not set");
    return null;
  }
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
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      console.error("Claude API call failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const block = data.content?.find((c) => c.type === "text" && typeof c.text === "string");
    const text = block?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (err) {
    console.error("Claude API call failed", err);
    return null;
  }
}
