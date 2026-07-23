import crypto from "crypto";

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Hash-first lookup with a temporary raw-token fallback for pre-hardening rows. */
export function opaqueTokenCandidates(token: string) {
  const hashed = hashOpaqueToken(token);
  return hashed === token ? [token] : [hashed, token];
}

export function createReference(prefix: string) {
  return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}
