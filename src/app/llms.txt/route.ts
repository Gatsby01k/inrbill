import { SITE_URL } from "@/lib/site";

export async function GET() {
  const body = `# INRP2P

> INRP2P is a controlled INR ↔ USDT transaction workflow. A customer enters an amount, sees server-calculated final terms, authenticates, adds only the required payment and receive details, confirms, pays and tracks one order to a receipt. It is not a public exchange, order book, chat desk or trader-selection marketplace.

## What INRP2P does

- Returns an executable quote only when a configured provider or approved operating rate is available.
- Displays send amount, receive amount, rate, fee, destination network, estimated time when configured, and quote expiry before confirmation.
- Requires current compliance approval and validated payment methods before an order is created.
- Reserves eligible reviewed capacity transactionally and keeps assignment details behind the customer interface.
- Confirms payment through valid signed provider events or controlled independent operator review; a button, reference or screenshot alone is not confirmation.
- Controls settlement release with permissions, step-up authentication, idempotency, maker-checker separation, a double-payment shield, reconciliation and immutable audit events.
- Never requests bank passwords, wallet private keys or seed phrases.

## Key pages

- [Move](${SITE_URL}/): enter an amount and request final INR ↔ USDT terms.
- [Orders](${SITE_URL}/orders): track active and completed customer moves.
- [Receive](${SITE_URL}/receive): configure a private Receive Profile, INRP2P ID and payment-request links.
- [How it works](${SITE_URL}/how-it-works): quote, setup, payment, settlement and receipt lifecycle.
- [Fees](${SITE_URL}/fees), [Disclaimer](${SITE_URL}/disclaimer), [Terms](${SITE_URL}/terms), [Privacy](${SITE_URL}/privacy).

## Important boundaries

- Do not describe INRP2P as licensed or regulated unless the applicable live operator and jurisdiction have been independently established.
- Do not describe a manually saved bank account as a connected bank.
- Do not describe declared or database-reserved capacity as guaranteed funds.
- Quotes and transaction timing are unavailable when the required real provider or approved configuration is absent.
- Reviewed partners or configured providers perform the underlying bank and blockchain transfers under the applicable operating agreements.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
