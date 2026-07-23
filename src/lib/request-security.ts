import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

function allowedOrigin() {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    return null;
  }
}

/** Reject cross-site state-changing requests before reading their body. */
export function isSameOriginRequest(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  const configured = allowedOrigin();
  if (configured && origin === configured) return true;
  return origin === request.nextUrl.origin;
}

export function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function serverActionIdentity() {
  const incoming = await headers();
  return (
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    incoming.get("x-real-ip") ||
    "unknown"
  );
}

export function validIdempotencyKey(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9:_-]{16,160}$/.test(value));
}
