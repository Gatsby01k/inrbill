import { createNotification } from "@/lib/notifications";
import { notifyUser as pushTelegram } from "@/lib/telegram";

/**
 * Single call for "let this user know" — writes the in-app notification
 * (bell icon) and pushes to Telegram (if they've linked it) at the same
 * time. Replaces bare notifyUser() at every call site that represents an
 * actual event the user should see even if they never open Telegram.
 * Neither half throws, so this never blocks the action that triggered it.
 */
export async function notify(
  userId: string,
  opts: { title: string; body: string; telegramHtml: string; link?: string },
): Promise<void> {
  await Promise.all([
    createNotification(userId, { title: opts.title, body: opts.body, link: opts.link }),
    pushTelegram(userId, opts.telegramHtml),
  ]);
}
