"use client";

import { useEffect } from "react";

/** Clears a locally saved form draft after a successful submission. */
export function ClearDraft({ draftKey = "inrp2p-request-draft-v2" }: { draftKey?: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }, [draftKey]);
  return null;
}
