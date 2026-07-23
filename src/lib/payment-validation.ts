import { isValidTronAddress } from "@/lib/deposit-policy";

export function normalizeUpiHandle(raw: string) {
  const value = raw.trim().toLowerCase();
  return /^[a-z0-9._-]{2,128}@[a-z0-9.-]{2,64}$/.test(value) ? value : null;
}

export function normalizeIfsc(raw: string) {
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value) ? value : null;
}

export function normalizeAccountNumber(raw: string) {
  const value = raw.replace(/[\s-]/g, "");
  return /^\d{6,20}$/.test(value) ? value : null;
}

export function normalizeWalletAddress(raw: string, network: "TRC20" | "ERC20" | "POLYGON") {
  const value = raw.trim();
  if (network === "TRC20") return isValidTronAddress(value) ? value : null;
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? value.toLowerCase() : null;
}

export function normalizeTransactionHash(raw: string, network?: "TRC20" | "ERC20" | "POLYGON") {
  const value = raw.trim();
  if (network === "TRC20") return /^[a-fA-F0-9]{64}$/.test(value) ? value.toLowerCase() : null;
  return /^(?:0x)?[a-fA-F0-9]{64}$/.test(value)
    ? `0x${value.replace(/^0x/i, "").toLowerCase()}`
    : null;
}
