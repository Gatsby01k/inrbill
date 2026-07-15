import crypto from "crypto";

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createReference(prefix: string) {
  return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}
