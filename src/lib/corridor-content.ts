// Static per-corridor copy for the programmatic SEO pages
// (src/app/corridors/[slug]/page.tsx). This is the "programmatic" part of
// "programmatic SEO" — three pages sharing one template and one data-fetch
// function (src/lib/corridor-page.ts), differentiated by real per-corridor
// numbers plus this hand-written content, not spun/templated prose.

import type { CorridorSlug } from "@/lib/corridor-page";

export type CorridorContent = {
  title: string;
  metaDescription: string;
  intro: string;
  requestType: string; // maps to REQUEST_TYPE_VALUES for the /request prefill
  faq: { q: string; a: string }[];
};

export const CORRIDOR_CONTENT: Record<CorridorSlug, CorridorContent> = {
  "inr-to-usdt": {
    title: "INR to USDT liquidity partners in India",
    metaDescription:
      "Real, current data on INR → USDT liquidity coverage: active reviewed partners, recent demand, turnaround, and a reference settlement-rate range from actually closed deals — not a quote, not an exchange rate.",
    intro:
      "Converting INR into USDT at volume — for treasury, payroll, settlement, or trading capital — usually means finding a counterparty who can actually move that size without moving the market or disappearing mid-trade. INRP2P reviews and verifies liquidity partners on this corridor before any introduction happens, so the numbers below reflect real, currently-active coverage, not a directory of unverified listings.",
    requestType: "INR_TO_USDT",
    faq: [
      {
        q: "Is the rate below what I'll get?",
        a: "No. It's a reference range built from the effective settlement rates of deals that actually closed on this corridor recently — never a quote or an ask. Your actual rate is agreed directly with the partner you're introduced to, and depends on size, timing and settlement method.",
      },
      {
        q: "How fast can an INR to USDT deal move?",
        a: "It depends on the partner's capacity and your own settlement readiness. The turnaround figures below are measured from real requests on this corridor — average time from a submitted request to a first match, and to a closed deal — not a marketing promise.",
      },
      {
        q: "What volume counts as worth submitting?",
        a: "There's no hard minimum, but the network is built around meaningful volume — occasional small trades are usually better served elsewhere. If you're unsure, submit a request; manual review will tell you honestly whether this is a fit.",
      },
      {
        q: "Does INRP2P hold funds or execute the trade?",
        a: "No. INRP2P never custodies the funds exchanged in the transaction, never executes a trade or transfer, and does not guarantee a match or an outcome. Its role ends at a reviewed introduction — everything after that is agreed and settled directly between you and the partner.",
      },
    ],
  },
  "usdt-to-inr": {
    title: "USDT to INR liquidity partners in India",
    metaDescription:
      "Real, current data on USDT → INR liquidity coverage: active reviewed partners, recent demand, turnaround, and a reference settlement-rate range from actually closed deals — not a quote, not an exchange rate.",
    intro:
      "Turning USDT back into INR — to fund payroll, settle with vendors, or realize gains — needs a partner with real onshore banking rails and enough capacity to clear at your size without days of delay. INRP2P verifies partners on this corridor's entity, banking coverage and capacity before any introduction, so what's below is real, currently-active coverage.",
    requestType: "USDT_TO_INR",
    faq: [
      {
        q: "Is the rate below what I'll get?",
        a: "No. It's a reference range built from the effective settlement rates of deals that actually closed on this corridor recently — never a quote or an ask. Your actual rate is agreed directly with the partner you're introduced to.",
      },
      {
        q: "How fast can a USDT to INR deal settle?",
        a: "It depends on the partner's banking rails and your settlement readiness. The turnaround figures below are measured from real requests on this corridor, not a marketing promise.",
      },
      {
        q: "Which banks and rails are covered?",
        a: "The banks and rails listed below are what currently-active, verified partners on this corridor have declared and had reviewed. Coverage changes as partners join or are re-verified — this reflects the current state, not a fixed list.",
      },
      {
        q: "Does INRP2P hold funds or execute the transfer?",
        a: "No. INRP2P never custodies the funds exchanged in the transaction, never executes a trade or transfer, and does not guarantee a match or outcome. Its role ends at a reviewed introduction.",
      },
    ],
  },
  "inr-payouts": {
    title: "INR payout liquidity partners in India",
    metaDescription:
      "Real, current data on INR payout liquidity coverage: active reviewed partners, recent demand and turnaround for bulk INR disbursements — payroll, vendor, and mass payouts — via a reviewed partner network, not an unverified directory.",
    intro:
      "Bulk INR payouts — payroll runs, vendor disbursements, mass payments — need a partner who can actually push volume through real banking rails on time, not just quote a rate. INRP2P reviews partners' banking coverage, capacity and compliance posture on this corridor before any introduction, so the numbers below reflect real, currently-active coverage. Note that INR payouts don't have a conversion rate the way INR↔USDT corridors do, so no reference rate applies here.",
    requestType: "INR_PAYOUTS",
    faq: [
      {
        q: "What counts as an INR payout request here?",
        a: "Bulk or recurring INR disbursements — payroll, vendor payments, mass payouts — routed through a reviewed liquidity partner's banking rails, as opposed to a currency conversion.",
      },
      {
        q: "How fast can a payout batch move?",
        a: "It depends on the partner's capacity, your batch size, and your own settlement readiness. The turnaround figures below are measured from real requests on this corridor, not a marketing promise.",
      },
      {
        q: "Which banks and rails are covered?",
        a: "The banks and rails listed below are what currently-active, verified partners on this corridor have declared and had reviewed — IMPS, NEFT, RTGS, UPI and bulk transfer coverage varies by partner.",
      },
      {
        q: "Does INRP2P execute the payout itself?",
        a: "No. INRP2P never custodies payout funds and never executes a payout — its role ends at a reviewed introduction to a partner with the right coverage. Execution and settlement happen directly between you and the partner.",
      },
    ],
  },
};
