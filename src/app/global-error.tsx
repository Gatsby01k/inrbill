"use client";

import { useEffect } from "react";
import { reportClientError } from "@/app/actions/report-error";

/**
 * Last-resort boundary — only triggers if the root layout itself throws.
 * Must render a full <html>/<body> since it replaces the root layout.
 * Deliberately plain (no design-system imports) so it can never fail to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[INRP2P] Root layout error", { message: error.message, digest: error.digest });
    reportClientError({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
      source: "client:global-error-boundary",
      // Root-layout failures are the most serious tier — nothing else on the
      // site can render while this is happening.
      severity: "FATAL",
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FAF7F1",
          color: "#1e293b",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "18px", fontWeight: 600 }}>INRP2P is temporarily unavailable</h1>
        <p style={{ marginTop: "8px", fontSize: "13px", color: "#64748b", maxWidth: "360px" }}>
          Please try again in a moment. If this continues, contact network operations.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #DD8114",
            background: "#EFA12F",
            color: "#231503",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
