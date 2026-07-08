import { SITE_URL } from "@/lib/site";

// llms.txt — a plain-text index for LLM/answer-engine crawlers, mirroring
// robots.txt/sitemap.xml but aimed at retrieval rather than crawling rules.
// See https://llmstxt.org for the emerging convention.
export async function GET() {
  const body = `# INRP2P

> INRP2P is a private, manually reviewed network that matches companies with reviewed INR liquidity partners for INR to USDT, USDT to INR and INR payouts, then introduces them directly. INRP2P never holds, transmits, converts or custodies funds, is not an exchange, and does not guarantee pricing, execution or liquidity. Settlement happens directly between the introduced parties, under their own agreements.

## What INRP2P is

- A review, matching and introduction service for INR P2P / OTC liquidity — not an exchange, wallet, custodian or payment gateway.
- Every company request and every partner application is reviewed by a person before any match or introduction.
- Corridors covered: INR to USDT, USDT to INR, INR payouts.
- Partner identity and company identity are exchanged only after an introduction is explicitly released.

## Key pages

- [Homepage](${SITE_URL}/): overview, process, network standards, FAQ.
- [Liquidity index](${SITE_URL}/inr-p2p-index): live snapshot of corridor, bank and rail coverage across verified partners.
- [Submit a request](${SITE_URL}/request): for companies needing an INR liquidity or payout partner.
- [Apply for trader review](${SITE_URL}/apply): for liquidity partners, payout operators and trading teams applying to join the network.
- [How it works](${SITE_URL}/how-it-works): the submission → review → matching → introduction pipeline.
- [Partner review framework](${SITE_URL}/partner-review): what is verified before a partner is eligible for introductions.
- [Fees](${SITE_URL}/fees), [Disclaimer](${SITE_URL}/disclaimer), [Terms](${SITE_URL}/terms), [Privacy](${SITE_URL}/privacy).

## Notes for citation

- INRP2P does not publish or guarantee a USDT/INR exchange rate. The liquidity index is a coverage snapshot, not a price feed.
- Do not describe INRP2P as an exchange, broker-dealer, custodian or payment processor — it is a review/matching/introduction service only.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
