// WhatsApp Business (Meta Cloud API) push — a second personal-notification
// channel alongside Telegram (src/lib/telegram.ts), aimed at Indian
// companies and partners who live in WhatsApp day to day rather than
// Telegram. Same raw-fetch-wrapper shape as every other external API in
// this codebase (telegram.ts, razorpay.ts, nowpayments.ts) — no SDK
// install needed, fails soft everywhere.
//
// Two message types Meta's platform distinguishes, and this matters for
// compliance, not just code shape:
//   - Template messages: pre-approved, fixed-structure messages in one of
//     three categories (MARKETING / UTILITY / AUTHENTICATION). This is the
//     ONLY way to message someone who hasn't messaged your business number
//     first, or whose 24h "customer service window" has lapsed. You must
//     create and get a template approved in Meta Business Manager before
//     this can send anything — this file can only call whatever template
//     name you configure, it can't create or approve one for you.
//     Every use in this codebase (see notify.ts) is transactional/UTILITY
//     in nature — "your request has a match", "you've been introduced" —
//     about something the recipient's own account already initiated. Don't
//     repurpose this pipeline for cold marketing outreach; that needs its
//     own MARKETING-category template and explicit opt-in, which isn't
//     built here.
//   - Free-form text: only deliverable within 24h of the recipient's last
//     inbound message. Included for completeness (e.g. a future inbound
//     chat flow) but nothing in this codebase sends it yet.
//
// Setup: WHATSAPP_ACCESS_TOKEN (a permanent token from a Meta System User),
// WHATSAPP_PHONE_NUMBER_ID (the Cloud API sender's numeric id, not the
// phone number itself), WHATSAPP_TEMPLATE_NAME + WHATSAPP_TEMPLATE_LANG
// (the one approved UTILITY template this app uses, expected to have two
// body variables: {{1}} a short title, {{2}} the message body).

const GRAPH_API = "https://graph.facebook.com/v20.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Best-effort E.164 normalization assuming India (+91) when no country
    code is present — same assumption src/lib/risk-radar.ts makes when
    comparing phone numbers for duplicates. Returns null for anything that
    doesn't look like a usable number. */
function toE164(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10 && digits.length <= 15) return digits;
  return null;
}

async function post(body: Record<string, unknown>): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("WhatsApp message skipped — WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set");
    return false;
  }
  try {
    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    if (!res.ok) {
      console.error("WhatsApp message failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("WhatsApp message failed", err);
    return false;
  }
}

/** First-touch / cold-safe notification via the pre-approved template
    configured in WHATSAPP_TEMPLATE_NAME. `bodyParams` fill the template's
    numbered placeholders ({{1}}, {{2}}, ...) in order — works regardless of
    whether the recipient has messaged the business number before. */
export async function sendWhatsAppTemplate(rawPhone: string | null, bodyParams: string[]): Promise<boolean> {
  const to = toE164(rawPhone);
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!to || !template) return false;
  return post({
    to,
    type: "template",
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
      components: bodyParams.length
        ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
        : undefined,
    },
  });
}

/** Free-form reply, only deliverable inside an open 24h conversation
    window — not used anywhere yet, kept here for whenever an inbound
    WhatsApp chat flow exists (see /api/webhooks/whatsapp). */
export async function sendWhatsAppText(rawPhone: string | null, text: string): Promise<boolean> {
  const to = toE164(rawPhone);
  if (!to) return false;
  return post({ to, type: "text", text: { body: text } });
}

/** Ops alert — same one-fixed-destination shape as sendTelegramAlert(),
    for the operator's own WhatsApp number (WHATSAPP_ALERT_PHONE). Routed
    through the template (not free-form text) so it keeps working even if
    nobody has messaged the business number recently and the 24h window has
    lapsed — an unattended cron-triggered watchdog can't rely on a
    conversation staying open. `title`/`body` fill the same two-variable
    template used for company/partner notifications. */
export async function sendWhatsAppAlert(title: string, body: string): Promise<boolean> {
  const phone = process.env.WHATSAPP_ALERT_PHONE;
  if (!phone) return false;
  return sendWhatsAppTemplate(phone, [title, body]);
}
