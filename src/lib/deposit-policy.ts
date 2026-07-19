export type DepositStatusValue = "AWAITING_PAYMENT" | "CONFIRMING" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "EXPIRED";

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,6})?$/;
const TX_PATTERN = /^(?:0x)?[a-fA-F0-9]{64}$/;

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

export function providerDepositStatus(input: {
  current: DepositStatusValue;
  providerStatus: string;
  paid: number;
  expected: number;
  payCurrency: string;
}): DepositStatusValue {
  if (input.current === "REFUNDED") return "REFUNDED";
  const status = input.providerStatus.toLowerCase();
  if (status === "finished") {
    // USDT-TRC20 has six decimals. Never turn a percentage tolerance into a
    // material shortfall on a large reserve; allow only one base unit for
    // harmless number conversion at the boundary.
    const exactEnough = Number.isFinite(input.paid) && input.paid + 0.000001 >= input.expected;
    return input.payCurrency.toLowerCase() === "usdttrc20" && exactEnough ? "CONFIRMED" : "CONFIRMING";
  }
  if (["confirming", "confirmed", "sending", "spending", "partially_paid"].includes(status)) return "CONFIRMING";
  if (status === "failed") return "REJECTED";
  if (status === "expired") return "EXPIRED";
  if (status === "refunded") return "REFUNDED";
  return input.current;
}
