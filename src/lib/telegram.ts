// Telegram push — two things layered on the same bot:
//   1. sendTelegramAlert()   — one-way ops alerts to a single fixed chat
//      (unchanged from before, used by the watchdogs).
//   2. sendTelegramMessageTo() / notifyUser() — personal push to individual
//      companies/partners once they've linked their own chat via the
//      /api/webhooks/telegram bot-webhook flow (see connectTelegram in
//      src/app/actions/portal.ts). Same bot, same token, different chat ids.
//
// Setup: create a bot via @BotFather, put the token in TELEGRAM_BOT_TOKEN.
// Telegram won't let a bot message someone who hasn't messaged it first, so
// whoever should receive alerts must open a chat with the bot and send it
// anything once (or add the bot to a private group/channel) before a numeric
// chat ID is discoverable — then set that ID as TELEGRAM_ALERT_CHAT_ID.

import { db } from "@/lib/db";

const TELEGRAM_API = "https://api.telegram.org";

async function send(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Telegram message skipped — TELEGRAM_BOT_TOKEN not set");
    return false;
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("Telegram message failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Telegram message failed", err);
    return false;
  }
}

export async function sendTelegramAlert(text: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!chatId) {
    console.error("Telegram alert skipped — TELEGRAM_ALERT_CHAT_ID not set");
    return false;
  }
  return send(chatId, text);
}

/** Push directly to an arbitrary chat id — used for personal user notifications. */
export async function sendTelegramMessageTo(chatId: string, text: string): Promise<boolean> {
  return send(chatId, text);
}

/**
 * Push to whichever Telegram chat a given User has linked, if any. Silently
 * does nothing (returns false) if the user never connected Telegram or the
 * bot token isn't configured — this is always a nice-to-have on top of the
 * workspace UI, never a dependency of the underlying action succeeding.
 */
export async function notifyUser(userId: string, text: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
    if (!user?.telegramChatId) return false;
    return await send(user.telegramChatId, text);
  } catch (err) {
    console.error("notifyUser failed", err);
    return false;
  }
}
