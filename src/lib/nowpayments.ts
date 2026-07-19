// NOWPayments — optional USDT-TRC20 collection for INRP2P service-fee
// invoices only. Partner reserves use the configured company wallet and
// never pass through this integration.
//
// Setup: create a NOWPayments account, add a payout wallet, generate an API
// key and an IPN secret key in the dashboard (Store/Payment Settings) →
// put them in NOWPAYMENTS_API_KEY / NOWPAYMENTS_IPN_SECRET. Register the
// IPN callback URL in the dashboard too — https://<your-domain>/api/webhooks/nowpayments.
// In Payment Settings, set "underpaid payments" to be flagged as
// partially_paid (not auto-finished) — this code only trusts a "finished"
// status, so that dashboard setting matters.

import crypto from "crypto";
import { SITE_URL } from "@/lib/site";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

// Locking pay_currency to USDT-TRC20 specifically (not "any coin") keeps
// this predictable: no exchange-rate exposure (USDT is a stablecoin), no
// surprise network choice, and it matches what INRP2P's own users already
// move day to day.
const PAY_CURRENCY = "usdttrc20";

function apiKey(): string | null {
  return process.env.NOWPAYMENTS_API_KEY || null;
}

export function isNowPaymentsConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

export type CreateCryptoInvoiceInput = {
  /** USDT amount, already in the same units as RevenueRecord.amount. */
  amountUsdt: number;
  description: string;
  /** Passed through as order_id — we use the RevenueRecord's own id so the
      webhook can match the record directly, no separate lookup table needed. */
  orderId: string;
  /** Optional hosted-checkout return URL. */
  successUrl?: string;
};

export type CryptoInvoiceResult = {
  id: string; // NOWPayments invoice id
  invoiceUrl: string;
};

/**
 * Creates a NOWPayments hosted USDT-TRC20 invoice. Never throws — returns
 * null and logs on failure so callers can roll back their local draft.
 */
export async function createCryptoInvoice(
  input: CreateCryptoInvoiceInput,
): Promise<CryptoInvoiceResult | null> {
  const key = apiKey();
  if (!key) {
    console.error("NOWPayments invoice skipped — NOWPAYMENTS_API_KEY not set");
    return null;
  }
  if (!(input.amountUsdt > 0)) {
    console.error("NOWPayments invoice skipped — amount must be positive");
    return null;
  }

  const body = {
    price_amount: input.amountUsdt,
    price_currency: "usdt",
    pay_currency: PAY_CURRENCY,
    order_id: input.orderId.slice(0, 100),
    order_description: input.description.slice(0, 2000),
    ipn_callback_url: `${SITE_URL}/api/webhooks/nowpayments`,
    success_url: input.successUrl ?? SITE_URL,
  };

  try {
    const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("NOWPayments invoice creation failed", res.status, json);
      return null;
    }
    return { id: String(json.id), invoiceUrl: json.invoice_url as string };
  } catch (err) {
    console.error("NOWPayments invoice creation failed", err);
    return null;
  }
}

/**
 * Recursively sorts an object's keys — NOWPayments signs the IPN body only
 * after alphabetically sorting keys at every nesting level, so signature
 * verification must reproduce that exact transformation before hashing.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Verifies the `x-nowpayments-sig` header on an incoming IPN webhook.
 * Unlike Razorpay, NOWPayments' own algorithm requires parsing the body,
 * deep-sorting its keys, then re-serializing — not hashing the raw bytes —
 * so the caller must pass the already-parsed JSON object here, not raw text.
 */
export function verifyNowPaymentsSignature(parsedBody: unknown, signature: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;
  const sortedJson = JSON.stringify(sortKeysDeep(parsedBody));
  const expected = crypto.createHmac("sha512", secret).update(sortedJson).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
