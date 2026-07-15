import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logError } from "@/lib/error-log";
import { sendTelegramMessageTo } from "@/lib/telegram";

// Telegram calls this for every incoming message once the bot's webhook is
// registered. Its only job is resolving a one-time link code (generated in
// the company/partner workspace via connectTelegram) back to the User row
// that requested it, and filling in that user's chat id so future pushes
// (introductions, verification) can reach them directly.
//
// One-time setup (Telegram has no dashboard for this — it's an API call):
//   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-domain>/api/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
// Run this once after deploying, using the same TELEGRAM_BOT_TOKEN already
// set for ops alerts, and a TELEGRAM_WEBHOOK_SECRET you choose yourself.
export const dynamic = "force-dynamic";

const LINK_CODE_RE = /^LINK-[A-F0-9]{8}$/;

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!configuredSecret || req.headers.get("x-telegram-bot-api-secret-token") !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let update: TelegramUpdate;
    try {
      update = (await req.json()) as TelegramUpdate;
    } catch {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim().toUpperCase();
    if (!chatId || !text) return NextResponse.json({ ok: true });

    if (!LINK_CODE_RE.test(text)) {
      // Not a link code — this bot doesn't otherwise process free-text
      // messages, so just acknowledge and stay silent.
      return NextResponse.json({ ok: true });
    }

    const user = await db.user.findUnique({ where: { telegramLinkCode: text } });
    if (!user) {
      await sendTelegramMessageTo(
        String(chatId),
        "This code isn't valid or has already been used. Generate a new one from your INRP2P workspace.",
      );
      return NextResponse.json({ ok: true });
    }

    await db.user.update({
      where: { id: user.id },
      data: { telegramChatId: String(chatId), telegramLinkCode: null },
    });
    await sendTelegramMessageTo(String(chatId), "✅ Connected — you'll get INRP2P updates here from now on.");

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError({ error: err, source: "route:/api/webhooks/telegram", severity: "ERROR" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
