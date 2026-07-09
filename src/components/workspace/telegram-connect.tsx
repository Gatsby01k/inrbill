import { connectTelegram, disconnectTelegram } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";

/**
 * Personal Telegram push opt-in for a company or partner workspace. Shows
 * one of three states: not connected (offer to generate a link code),
 * pending (code generated, waiting for the person to message the bot), or
 * connected (offer to disconnect). The actual linking happens outside this
 * component entirely — via the /api/webhooks/telegram bot webhook — so this
 * is purely a status display plus the two triggers.
 */
export function TelegramConnectCard({
  telegramChatId,
  telegramLinkCode,
  botUsername,
}: {
  telegramChatId: string | null;
  telegramLinkCode: string | null;
  botUsername?: string;
}) {
  const connected = Boolean(telegramChatId);
  const botLink = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Telegram notifications
      </p>

      {connected ? (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
            Connected — you&apos;ll get a message the moment there&apos;s a real update
            (introduction, verification), instead of having to check back here.
          </p>
          <form action={disconnectTelegram} className="mt-3">
            <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Disconnecting…">
              Disconnect
            </SubmitButton>
          </form>
        </>
      ) : telegramLinkCode ? (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
            {botLink ? (
              <>
                Open{" "}
                <a href={botLink} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:underline">
                  the bot
                </a>{" "}
                and send it this code:
              </>
            ) : (
              "Send this code to the INRP2P Telegram bot:"
            )}
          </p>
          <p className="mt-2 rounded-md border border-gold-500/25 bg-gold-500/[0.06] px-3 py-2 text-center font-mono text-sm text-gold-800">
            {telegramLinkCode}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <form action={connectTelegram}>
              <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Generating…">
                Generate a new code
              </SubmitButton>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
            Get a push the moment something real happens — a match, an introduction, a
            verification update — instead of checking this page.
          </p>
          <form action={connectTelegram} className="mt-3">
            <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Generating…">
              Connect Telegram
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
