const SUFFIX_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  l: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
  cr: 10_000_000,
  crore: 10_000_000,
  crores: 10_000_000,
};

export type ParsedAmount =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "invalid" | "max-unavailable" | "out-of-range" };

/**
 * Parses the shorthand people actually type in India while returning a plain
 * decimal string suitable for server validation. This is convenience only:
 * every financial calculation is repeated on the server.
 */
export function parseIndianAmount(
  raw: string,
  options: { max?: string; minimum?: number; maximum?: number; decimals?: number } = {},
): ParsedAmount {
  const input = raw
    .trim()
    .toLowerCase()
    .replace(/[₹,\s_]/g, "");

  if (!input) return { ok: false, reason: "empty" };
  if (input === "max") {
    if (!options.max) return { ok: false, reason: "max-unavailable" };
    return parseIndianAmount(options.max, { ...options, max: undefined });
  }

  const match = input.match(/^(\d+(?:\.\d+)?)(k|l|lakh|lakhs|cr|crore|crores)?$/);
  if (!match) return { ok: false, reason: "invalid" };

  const decimals = options.decimals ?? 6;
  const base = Number(match[1]);
  const multiplier = match[2] ? SUFFIX_MULTIPLIER[match[2]] : 1;
  const value = base * multiplier;
  const minimum = options.minimum ?? 0.000001;
  const maximum = options.maximum ?? 1_000_000_000;

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    return { ok: false, reason: "out-of-range" };
  }

  const fixed = value.toFixed(decimals).replace(/\.?0+$/, "");
  return { ok: true, value: fixed };
}

export function formatIndianNumber(value: string | number, maximumFractionDigits = 2) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatCurrencyAmount(value: string | number, currency: "INR" | "USDT") {
  const digits = currency === "INR" ? 2 : 6;
  const formatted = formatIndianNumber(value, digits);
  return currency === "INR" ? `₹${formatted}` : `${formatted} USDT`;
}
