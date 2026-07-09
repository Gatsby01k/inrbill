import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Hand-rolled TOTP (RFC 6238) + base32 (RFC 4648) — no `otplib`/`speakeasy`/
 * `qrcode` package is available in this project, so this implements the
 * standard directly on top of Node's built-in `crypto` module. Compatible
 * with Google Authenticator, Authy, 1Password, etc. — any standard TOTP app.
 *
 * Params locked to the universal defaults every authenticator app assumes:
 * SHA-1, 6 digits, 30-second step. Changing any of these breaks compatibility
 * with apps that don't read the otpauth URI's algorithm/digits/period params.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

/** Encode raw bytes as an RFC 4648 base32 string (no padding). */
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decode an RFC 4648 base32 string (case-insensitive, padding/spaces ignored) back to bytes. */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new random TOTP secret (160 bits, the RFC's recommended HMAC-SHA1 key size), base32-encoded. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** otpauth:// URI for the user to paste into an authenticator app (no QR image — text only, no `qrcode` package available). */
export function totpKeyUri(secret: string, accountLabel: string, issuer = "INRP2P") {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer; writeBigUInt64BE covers the full range.
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binCode % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Verify a 6-digit code against the secret, allowing ±1 step (90s total
 * window) to absorb clock drift between the server and the user's phone —
 * the same tolerance Google Authenticator-compatible servers use by default.
 */
export function verifyTotp(secret: string, code: string, windowSteps = 1): boolean {
  const trimmed = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let errorWindow = -windowSteps; errorWindow <= windowSteps; errorWindow++) {
    const candidate = hotp(secret, counter + errorWindow);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(trimmed))) {
      return true;
    }
  }
  return false;
}

/** Generate N human-friendly single-use backup codes (e.g. "XXXX-XXXX"), returned in plaintext for one-time display. */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

/** Checks a submitted backup code against the stored hashed list; returns the matched hash (to remove) or null. */
export async function matchBackupCode(
  submitted: string,
  hashedCodes: string[],
): Promise<string | null> {
  const clean = submitted.trim().toUpperCase();
  for (const hash of hashedCodes) {
    if (await bcrypt.compare(clean, hash)) return hash;
  }
  return null;
}
