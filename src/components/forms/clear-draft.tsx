"use client";

import { useEffect } from "react";

/** Clears the locally saved request draft after a successful submission. */
export function ClearDraft() {
  useEffect(() => {
    try {
      localStorage.removeItem("inrp2p-request-draft-v1");
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }, []);
  return null;
}
