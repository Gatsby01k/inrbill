"use server";

import { logError } from "@/lib/error-log";
import type { ErrorSeverity } from "@prisma/client";

/**
 * Bridge for client-side error boundaries (error.tsx / global-error.tsx),
 * which run in the browser and can't reach the database directly. Reports
 * are best-effort — logError() itself never throws, so this can't make a
 * broken page worse by failing.
 */
export async function reportClientError(input: {
  message: string;
  digest?: string;
  stack?: string;
  url?: string;
  source: string;
  severity?: ErrorSeverity;
}) {
  const err = new Error(input.message);
  if (input.stack) err.stack = input.stack;
  await logError({
    error: err,
    source: input.source,
    severity: input.severity ?? "ERROR",
    url: input.url ?? null,
    meta: input.digest ? { digest: input.digest } : undefined,
  });
}
