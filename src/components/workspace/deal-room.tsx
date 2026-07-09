import type { IntroductionMessage } from "@prisma/client";
import { postDealMessage } from "@/app/actions/dealroom";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/ui";
import { cn, fmtDateTime } from "@/lib/format";

/**
 * In-platform thread for a single introduction. Keeps the post-intro
 * conversation — and the trust signal it represents — on the platform
 * instead of leaking entirely to outside email/Telegram the moment two
 * sides are connected.
 */
export function DealRoom({
  matchId,
  messages,
  viewerSide,
  backHidden,
}: {
  matchId: string;
  messages: IntroductionMessage[];
  viewerSide: "COMPANY" | "PARTNER" | "INTERNAL";
  backHidden?: Record<string, string>;
}) {
  return (
    <div>
      {messages.length ? (
        <ul className="space-y-3">
          {messages.map((m) => {
            const mine = m.authorSide === viewerSide;
            const system = m.authorSide === "INTERNAL";
            return (
              <li
                key={m.id}
                className={cn("flex", mine && !system ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5",
                    system
                      ? "border border-gold-500/25 bg-gold-500/[0.06] text-slate-700"
                      : mine
                        ? "bg-gradient-to-b from-gold-400 to-gold-600 text-[#231503]"
                        : "border border-black/[0.08] bg-[#FCFAF5] text-slate-700",
                  )}
                >
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1.5 text-[10.5px]",
                      mine && !system ? "text-[#231503]/60" : "text-slate-400",
                    )}
                  >
                    {m.authorLabel} · {fmtDateTime(m.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="No messages yet"
          body="Once you've been introduced, coordinate settlement details, verification and timing right here."
        />
      )}

      <form action={postDealMessage} className="mt-4 flex items-end gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        {backHidden
          ? Object.entries(backHidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
          : null}
        <textarea
          name="body"
          rows={2}
          className="input flex-1 resize-none"
          placeholder="Message the other side…"
        />
        <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Sending…">
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
