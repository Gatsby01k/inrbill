import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { logError } from "@/lib/error-log";
import { sendWhatsAppText } from "@/lib/whatsapp";

// Meta calls GET once, at setup time, to verify you actually own this URL
// (the "verification handshake"), then POSTs every inbound message/status
// update afterward. This app doesn't run a full WhatsApp support inbox —
// inbound messages are logged to the audit log (visible on /admin/audit,
// keyed to a matching company/partner when their phone number is on file)
// and get one plain acknowledgment reply, so a company or partner texting
// the business number doesn't get silence. Anything beyond that (real
// two-way support chat) is future work.
//
// One-time setup in Meta's App Dashboard → WhatsApp → Configuration:
//   Callback URL: https://<your-domain>/api/webhooks/whatsapp
//   Verify token: whatever you set as WHATSAPP_VERIFY_TOKEN
// Subscribe to the "messages" webhook field.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: { from?: string; id?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

function normalizePhone(from: string): string {
  // Meta sends the sender's number with country code, no "+" — take the
  // last 10 digits so it lines up with how src/lib/risk-radar.ts and
  // src/lib/whatsapp.ts both normalize Indian mobile numbers.
  const digits = from.replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as WhatsAppWebhookPayload | null;
    const messages = payload?.entry?.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []) ?? [];

    for (const msg of messages) {
      if (!msg.from) continue;
      const phoneTail = normalizePhone(msg.from);

      const [company, partner] = await Promise.all([
        db.companyProfile.findFirst({ where: { phone: { endsWith: phoneTail } }, select: { id: true, companyName: true } }),
        db.partnerProfile.findFirst({ where: { phone: { endsWith: phoneTail } }, select: { id: true, displayName: true } }),
      ]);
      const matched = company ?? partner;

      await audit({
        action: "whatsapp.inbound_message",
        entityType: "WhatsAppMessage",
        entityId: msg.id ?? msg.from,
        actorLabel: matched ? ("companyName" in matched ? matched.companyName : matched.displayName) : msg.from,
        requestId: null,
        partnerId: partner ? partner.id : null,
        meta: { from: msg.from, text: msg.text?.body ?? null, matched: Boolean(matched) },
      });

      await sendWhatsAppText(
        msg.from,
        "Thanks for reaching out — this inbox isn't monitored live yet. Message us on Telegram or open your INRP2P workspace and an operator will follow up shortly.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError({ error: err, source: "route:/api/webhooks/whatsapp", severity: "ERROR" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
