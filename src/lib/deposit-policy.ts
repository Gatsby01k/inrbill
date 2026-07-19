import crypto from "node:crypto";

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,6})?$/;
const TX_PATTERN = /^(?:0x)?[a-fA-F0-9]{64}$/;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isValidDepositAmount(raw: string) {
  if (!AMOUNT_PATTERN.test(raw)) return false;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 10 && amount <= 1_000_000;
}

export function normalizeDepositTxHash(raw: string) {
  const value = raw.trim();
  if (!TX_PATTERN.test(value)) return null;
  return value.replace(/^0x/i, "").toLowerCase();
}

function decodeBase58(value: string): Buffer | null {
  let number = BigInt(0);
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    number = number * BigInt(58) + BigInt(digit);
  }
  const bytes: number[] = [];
  while (number > BigInt(0)) {
    bytes.unshift(Number(number & BigInt(255)));
    number = number >> BigInt(8);
  }
  for (let i = 0; i < value.length - 1 && value[i] === "1"; i += 1) bytes.unshift(0);
  return Buffer.from(bytes);
}

/** Strict Base58Check validation for a mainnet TRON account address. */
export function isValidTronAddress(raw: string) {
  const value = raw.trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return false;
  const decoded = decodeBase58(value);
  if (!decoded || decoded.length !== 25 || decoded[0] !== 0x41) return false;
  const payload = decoded.subarray(0, 21);
  const checksum = crypto.createHash("sha256").update(crypto.createHash("sha256").update(payload).digest()).digest().subarray(0, 4);
  return crypto.timingSafeEqual(checksum, decoded.subarray(21));
}
