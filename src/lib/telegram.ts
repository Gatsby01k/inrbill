// Minimal one-way Telegram push — no bot framework, no webhook, just the
// Bot API's sendMessage endpoint. Used for internal ops alerts only.
//
// Setup: create a bot via @BotFather, put the token in TELEGRAM_BOT_TOKEN.
// Telegram won't let a bot message someone who hasn't messaged it first, so
// whoever should receive alerts must open a chat with the bot and send it
// anything once (or add the bot to a private group/channel) before a numeric
// chat ID is discoverable — then set that ID as TELEGRAM_ALERT_CHAT_ID.

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram alert skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID not set");
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
      console.error("Telegram alert failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Telegram alert failed", err);
    return false;
  }
}
