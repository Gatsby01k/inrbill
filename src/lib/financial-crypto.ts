import crypto from "crypto";

const VERSION = "v1";

export class FinancialDataConfigurationError extends Error {
  constructor() {
    super("Encrypted financial-data storage is not configured.");
    this.name = "FinancialDataConfigurationError";
  }
}

function encryptionKey() {
  const configured = process.env.FINANCIAL_DATA_ENCRYPTION_KEY?.trim();
  if (!configured) throw new FinancialDataConfigurationError();
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new FinancialDataConfigurationError();
  return key;
}

function hmacKey() {
  const configured = process.env.FINANCIAL_DATA_HMAC_KEY?.trim();
  if (!configured) return encryptionKey();
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length < 32) throw new FinancialDataConfigurationError();
  return key;
}

export function encryptSensitive(plainText: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSensitive(encrypted: string) {
  const [version, ivRaw, tagRaw, ciphertextRaw] = encrypted.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Encrypted financial data is malformed.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptFinancialJson(value: Record<string, unknown>) {
  return encryptSensitive(JSON.stringify(value));
}

export function decryptFinancialJson<T extends Record<string, unknown>>(encrypted: string) {
  return JSON.parse(decryptSensitive(encrypted)) as T;
}

export function financialFingerprint(value: string) {
  return crypto
    .createHmac("sha256", hmacKey())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function maskAccount(bankName: string, accountNumber: string) {
  return `${bankName.trim().slice(0, 32)} ••••${accountNumber.slice(-4)}`;
}

export function maskUpi(handle: string) {
  const [local, provider] = handle.split("@");
  const visible = local.length <= 2 ? local[0] ?? "*" : local.slice(0, 2);
  return `${visible}${"•".repeat(Math.min(4, Math.max(2, local.length - visible.length)))}@${provider}`;
}

export function maskWallet(network: string, address: string) {
  return `${network} ••••${address.slice(-4)}`;
}

export function maskReference(reference: string) {
  return reference.length <= 6 ? `••${reference.slice(-2)}` : `••••${reference.slice(-6)}`;
}
