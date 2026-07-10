"use client";

import { useState } from "react";
import { postDealMessage } from "@/app/actions/dealroom";
import { SubmitButton } from "@/components/submit-button";

/** The interactive half of the deal room — pulled out of the mostly-static
    DealRoom so the "Suggest a reply" button can hold its own client state
    (the draft text) without turning the whole thread into a client
    component. */
export function DealComposer({
  matchId,
  introductionId,
  backHidden,
  aiEnabled,
}: {
  matchId: string;
  introductionId: string;
  backHidden?: Record<string, string>;
  aiEnabled: boolean;
}) {
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);

  async function suggestReply() {
    setDrafting(true);
    try {
      const res = await fetch("/api/deal-room/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introductionId }),
      });
      const data = await res.json();
      if (data.text) setBody(data.text);
    } catch {
      // Silent — the composer just stays empty, nothing breaks.
    } finally {
      setDrafting(false);
    }
  }

  return (
    <form action={postDealMessage} className="mt-4 flex flex-col gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      {backHidden
        ? Object.entries(backHidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <textarea
        name="body"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="input resize-none"
        placeholder="Message the other side…"
      />
      <div className="flex items-center justify-between gap-2">
        {aiEnabled ? (
          <button type="button" onClick={suggestReply} disabled={drafting} className="btn btn-ghost btn-sm">
            {drafting ? "Drafting…" : "✨ Suggest a reply"}
          </button>
        ) : (
          <span />
        )}
        <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Sending…">
          Send
        </SubmitButton>
      </div>
    </form>
  );
}
