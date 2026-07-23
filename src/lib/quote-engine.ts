import { Prisma, type Currency, type Direction, type QuoteExactSide } from "@prisma/client";

export class QuoteUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteUnavailableError";
  }
}

type RateResult = {
  rate: Prisma.Decimal;
  provider: string;
  providerReference?: string;
  expiresAt: Date;
};

export type QuoteCalculation = {
  inputAmount: Prisma.Decimal;
  sendCurrency: Currency;
  receiveCurrency: Currency;
  sendAmount: Prisma.Decimal;
  receiveAmount: Prisma.Decimal;
  rate: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  feeCurrency: Currency;
  feeBps: number;
};

const INR_DP = 2;
const USDT_DP = 6;

function positiveDecimal(value: unknown, label: string) {
  try {
    const decimal = new Prisma.Decimal(String(value));
    if (!decimal.isFinite() || decimal.lte(0)) throw new Error();
    return decimal;
  } catch {
    throw new QuoteUnavailableError(`${label} is invalid.`);
  }
}

function feeBps() {
  const configured = process.env.INRP2P_FEE_BPS;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new QuoteUnavailableError("Transaction pricing is not configured.");
  }
  const value = Number(configured ?? "100");
  if (!Number.isInteger(value) || value < 0 || value >= 10_000) {
    throw new QuoteUnavailableError("Transaction pricing is invalid.");
  }
  return value;
}

function quoteTtlSeconds() {
  const value = Number(process.env.INRP2P_QUOTE_TTL_SECONDS ?? "30");
  return Number.isInteger(value) ? Math.min(120, Math.max(10, value)) : 30;
}

async function rateFromConfiguredProvider(
  direction: Direction,
  inputAmount: string,
  exactSide: QuoteExactSide,
): Promise<RateResult | null> {
  const url = process.env.EXECUTION_QUOTE_PROVIDER_URL;
  const apiKey = process.env.EXECUTION_QUOTE_PROVIDER_API_KEY;
  if (!url || !apiKey) return null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ direction, inputAmount, exactSide }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new QuoteUnavailableError("The quote provider is temporarily unavailable.");
  }

  if (!response.ok) {
    throw new QuoteUnavailableError("The quote provider could not return an executable rate.");
  }

  const payload = (await response.json()) as {
    rate?: unknown;
    reference?: unknown;
    expiresAt?: unknown;
  };
  const rate = positiveDecimal(payload.rate, "Provider rate");
  if (rate.lt(1) || rate.gt(10_000)) {
    throw new QuoteUnavailableError("The provider rate is outside the accepted guardrails.");
  }

  const providerExpiry =
    typeof payload.expiresAt === "string" ? new Date(payload.expiresAt) : null;
  const maximumExpiry = new Date(Date.now() + quoteTtlSeconds() * 1_000);
  const expiresAt =
    providerExpiry && Number.isFinite(providerExpiry.getTime()) && providerExpiry > new Date()
      ? new Date(Math.min(providerExpiry.getTime(), maximumExpiry.getTime()))
      : maximumExpiry;

  return {
    rate,
    provider: "EXECUTION_PROVIDER",
    providerReference:
      typeof payload.reference === "string" ? payload.reference.slice(0, 160) : undefined,
    expiresAt,
  };
}

async function executionRate(
  direction: Direction,
  inputAmount: string,
  exactSide: QuoteExactSide,
): Promise<RateResult> {
  const provider = await rateFromConfiguredProvider(direction, inputAmount, exactSide);
  if (provider) return provider;

  const configured = process.env.EXECUTION_RATE_INR_PER_USDT;
  if (!configured) {
    throw new QuoteUnavailableError(
      "Live execution pricing is not connected yet. No estimated or fabricated rate is shown.",
    );
  }
  const rate = positiveDecimal(configured, "Configured execution rate");
  if (rate.lt(1) || rate.gt(10_000)) {
    throw new QuoteUnavailableError("The configured execution rate is outside guardrails.");
  }
  return {
    rate,
    provider: "OPERATOR_CONFIGURED_RATE",
    expiresAt: new Date(Date.now() + quoteTtlSeconds() * 1_000),
  };
}

function inrBounds() {
  return {
    min: positiveDecimal(process.env.EXECUTION_MIN_INR ?? "1000", "Minimum INR amount"),
    max: positiveDecimal(process.env.EXECUTION_MAX_INR ?? "10000000", "Maximum INR amount"),
  };
}

function ensureBounds(calculation: QuoteCalculation) {
  const { min, max } = inrBounds();
  const inrAmount =
    calculation.sendCurrency === "INR" ? calculation.sendAmount : calculation.receiveAmount;
  if (inrAmount.lt(min) || inrAmount.gt(max)) {
    throw new QuoteUnavailableError(
      `Amount must be between ₹${min.toFixed(0)} and ₹${max.toFixed(0)}.`,
    );
  }
}

export async function calculateQuote(
  direction: Extract<Direction, "INR_TO_USDT" | "USDT_TO_INR">,
  inputAmountRaw: string,
  exactSide: QuoteExactSide,
): Promise<QuoteCalculation & Pick<RateResult, "provider" | "providerReference" | "expiresAt">> {
  const inputAmount = positiveDecimal(inputAmountRaw, "Amount");
  const rateResult = await executionRate(direction, inputAmountRaw, exactSide);
  const bps = feeBps();
  const feeRatio = new Prisma.Decimal(bps).div(10_000);
  const netRatio = new Prisma.Decimal(1).minus(feeRatio);
  const rate = rateResult.rate;

  let result: QuoteCalculation;
  if (direction === "INR_TO_USDT" && exactSide === "SEND") {
    const send = inputAmount.toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_HALF_UP);
    const fee = send.mul(feeRatio).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_HALF_UP);
    const receive = send.minus(fee).div(rate).toDecimalPlaces(USDT_DP, Prisma.Decimal.ROUND_DOWN);
    result = {
      inputAmount,
      sendCurrency: "INR",
      receiveCurrency: "USDT",
      sendAmount: send,
      receiveAmount: receive,
      rate,
      feeAmount: fee,
      feeCurrency: "INR",
      feeBps: bps,
    };
  } else if (direction === "INR_TO_USDT") {
    const receive = inputAmount.toDecimalPlaces(USDT_DP, Prisma.Decimal.ROUND_UP);
    const netInr = receive.mul(rate);
    const send = netInr.div(netRatio).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_UP);
    result = {
      inputAmount,
      sendCurrency: "INR",
      receiveCurrency: "USDT",
      sendAmount: send,
      receiveAmount: receive,
      rate,
      feeAmount: send.minus(netInr).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_UP),
      feeCurrency: "INR",
      feeBps: bps,
    };
  } else if (exactSide === "SEND") {
    const send = inputAmount.toDecimalPlaces(USDT_DP, Prisma.Decimal.ROUND_HALF_UP);
    const grossInr = send.mul(rate);
    const fee = grossInr.mul(feeRatio).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_HALF_UP);
    result = {
      inputAmount,
      sendCurrency: "USDT",
      receiveCurrency: "INR",
      sendAmount: send,
      receiveAmount: grossInr.minus(fee).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_DOWN),
      rate,
      feeAmount: fee,
      feeCurrency: "INR",
      feeBps: bps,
    };
  } else {
    const receive = inputAmount.toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_UP);
    const grossInr = receive.div(netRatio);
    const send = grossInr.div(rate).toDecimalPlaces(USDT_DP, Prisma.Decimal.ROUND_UP);
    result = {
      inputAmount,
      sendCurrency: "USDT",
      receiveCurrency: "INR",
      sendAmount: send,
      receiveAmount: receive,
      rate,
      feeAmount: grossInr.minus(receive).toDecimalPlaces(INR_DP, Prisma.Decimal.ROUND_UP),
      feeCurrency: "INR",
      feeBps: bps,
    };
  }

  if (result.sendAmount.lte(0) || result.receiveAmount.lte(0)) {
    throw new QuoteUnavailableError("Amount is too small after fees.");
  }
  ensureBounds(result);
  return { ...result, ...rateResult };
}

export function quoteToPublicJson(quote: {
  id: string;
  direction: Direction;
  exactSide: QuoteExactSide;
  sendCurrency: Currency;
  receiveCurrency: Currency;
  sendAmount: Prisma.Decimal;
  receiveAmount: Prisma.Decimal;
  rate: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  feeCurrency: Currency;
  expiresAt: Date;
}) {
  const configuredEta = Number(process.env.INRP2P_EXECUTION_ETA_MINUTES);
  const etaMinutes =
    Number.isInteger(configuredEta) && configuredEta > 0 && configuredEta <= 24 * 60
      ? configuredEta
      : null;
  return {
    id: quote.id,
    direction: quote.direction,
    exactSide: quote.exactSide,
    sendCurrency: quote.sendCurrency,
    receiveCurrency: quote.receiveCurrency,
    sendAmount: quote.sendAmount.toFixed(quote.sendCurrency === "INR" ? 2 : 6),
    receiveAmount: quote.receiveAmount.toFixed(quote.receiveCurrency === "INR" ? 2 : 6),
    rate: quote.rate.toFixed(4),
    feeAmount: quote.feeAmount.toFixed(quote.feeCurrency === "INR" ? 2 : 6),
    feeCurrency: quote.feeCurrency,
    etaMinutes,
    expiresAt: quote.expiresAt.toISOString(),
  };
}
