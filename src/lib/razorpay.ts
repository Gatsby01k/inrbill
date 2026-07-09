// Razorpay Payment Links — collection of INRP2P's own service fees
// (RevenueRecord: introduction fees, success fees, retainers, etc.) only.
// This never touches the underlying P2P trade funds between company and
// partner — INRP2P remains strictly non-custodial for those at all times.
//
// Setup: create a Razorpay account (KYB required for live mode), grab the
// Key ID/Secret from Settings → API Keys → put them in RAZORPAY_KEY_ID /
// RAZORPAY_KEY_SECRET, then register a webhook in the Razorpay dashboard
// pointing at https://<your-domain>/api/webhooks/razorpay with the
// "payment_link.paid" event enabled — Razorpay shows you a signing secret
// at that point, put it in RAZORPAY_WEBHOOK_SECRET.

import crypto from "crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function authHeader(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export type CreatePaymentLinkInput = {
  /** Rupees, not paise — converted to the smallest unit internally. */
  amountRupees: number;
  description: string;
  /** Must be unique per link — we pass the RevenueRecord id (already unique, ≤ 40 chars). */
  referenceId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerContact?: string | null;
};

export type PaymentLinkResult = {
  id: string; // plink_xxx
  shortUrl: string;
  status: string;
};

/**
 * Creates a Razorpay Payment Link for one of INRP2P's own service-fee
 * RevenueRecords. Never throws — returns null and logs on any failure, so a
 * gateway outage or missing config degrades to "link not available yet"
 * instead of crashing the admin action that calls it.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<PaymentLinkResult | null> {
  const auth = authHeader();
  if (!auth) {
    console.error("Razorpay payment link skipped — RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not set");
    return null;
  }
  if (!(input.amountRupees > 0)) {
    console.error("Razorpay payment link skipped — amount must be positive");
    return null;
  }

  const body: Record<string, unknown> = {
    amount: Math.round(input.amountRupees * 100),
    currency: "INR",
    description: input.description.slice(0, 2000),
    reference_id: input.referenceId.slice(0, 40),
    // Deliberately not auto-notifying — an operator reviews and sends the
    // link themselves (email, Telegram, WhatsApp), keeping a human in the
    // loop before any payment request goes out to a customer.
    notify: { sms: false, email: false },
    reminder_enable: false,
  };
  if (input.customerName || input.customerEmail || input.customerContact) {
    body.customer = {
      ...(input.customerName ? { name: input.customerName } : {}),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      ...(input.customerContact ? { contact: input.customerContact } : {}),
    };
  }

  try {
    const res = await fetch(`${RAZORPAY_API}/payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Razorpay payment link creation failed", res.status, json);
      return null;
    }
    return { id: json.id as string, shortUrl: json.short_url as string, status: json.status as string };
  } catch (err) {
    console.error("Razorpay payment link creation failed", err);
    return null;
  }
}

/**
 * Verifies the `X-Razorpay-Signature` header on an incoming webhook. Must be
 * called with the RAW request body text — Razorpay signs the exact bytes it
 * sent, and re-serializing a parsed JSON object can produce a different
 * string (key order, spacing) that silently breaks verification.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
