import crypto from "crypto";

export function signWebhookBody(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyWebhookSignature(secret: string, body: string, signature: string | null) {
  if (!secret || !signature) return false;
  const provided = signature.replace(/^sha256=/, "");
  const expected = signWebhookBody(secret, body);
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function payloadHash(body: string) {
  return crypto.createHash("sha256").update(body).digest("hex");
}
