import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion";
import { ApplyTraderCta } from "@/components/site/apply-trader-cta";
import { EmbedBadgeSection } from "@/components/site/embed-badge-section";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { EmptyState, Stat } from "@/components/ui";
import { getLiquidityIndexSnapshot, getRateIndexSnapshot } from "@/lib/liquidity-index";
import { BANK_OPTIONS, DIRECTION_OPTIONS, METHOD_OPTIONS } from "@/lib/options";
import { SITE_URL } from "@/lib/site";

// Real network data, refreshed hourly rather than on every request — this is
// a coverage snapshot, not a live feed, so an hour of staleness is honest.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "INR P2P & USDT-INR Liquidity Index — Coverage & Reference Rate",
  description:
    "A live, honest snapshot of the INRP2P network: which INR↔USDT and INR payout corridors, banks and rails are currently covered by reviewed liquidity partners, plus a reference rate range built from real closed deals — not asks, not quotes.",
  alternates: { canonical: "/inr-p2p-index" },
};

const INDEX_FAQ = [
  {
    q: "Is this a live USDT/INR exchange rate?",
    a: "No. INRP2P is not an exchange and does not publish or guarantee a rate. This index shows which corridors, banks and rails reviewed partners currently cover — a coverage snapshot, not a price feed. Pricing is agreed directly between the introduced parties.",
  },
  {
    q: "Where does the reference rate below come from?",
    a: "It's built from effective settlement rates that operations records when a real introduction closes — never a quote, never an ask price. We only publish a range once enough deals have closed on a corridor recently, so a single outlier can't skew it.",
  },
  {
    q: "How often does this index update?",
    a: "It reflects the current state of verified and limited partners in the network and refreshes roughly every hour.",
  },
  {
    q: "How do I get counted in this index?",
    a: "Apply as a liquidity partner. Once your application passes manual review and verification, your declared corridors, banks and rails count toward this index.",
  },
];

export default async function LiquidityIndexPage() {
  const [
    { total, verified, corridors, corridorsCovered, banksCovered, methodsCovered, updatedOn },
    rate,
  ] = await Promise.all([getLiquidityIndexSnapshot(), getRateIndexSnapshot()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "INRP2P INR P2P & USDT-INR Liquidity Index",
        description:
          "Aggregated snapshot of corridor, bank and payment-rail coverage across INRP2P's reviewed INR liquidity partner network. Not individually identifying — coverage only.",
        url: `${SITE_URL}/inr-p2p-index`,
        isAccessibleForFree: true,
        creator: { "@type": "Organization", name: "INRP2P", url: SITE_URL },
        temporalCoverage: updatedOn,
        variableMeasured: [
          "Corridor coverage",
          "Bank coverage",
          "Payment rail coverage",
          "Verified partner count",
          "INR/USDT reference settlement rate range",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: INDEX_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <main className="hero-aurora flex-1 pb-24 pt-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow">Network snapshot · updated hourly</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-900 sm:text-[2.5rem]">
            INR P2P &amp; USDT-INR liquidity index.
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
            A coverage snapshot of the INRP2P network — which corridors, banks and
            payment rails reviewed liquidity partners currently support. This is
            not a price feed and not a guarantee: INRP2P is not an exchange, holds
            no funds, and does not set rates. It is an honest read on what real,
            verified coverage exists right now.
          </p>

          {/* What is INR P2P — definitional block for humans and answer engines */}
          <Reveal className="card mt-8 p-6 sm:p-7">
            <p className="text-[13px] font-semibold text-slate-900">
              What &ldquo;INR P2P&rdquo; actually means here
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              INR P2P (peer-to-peer) liquidity is a direct trade or payout between
              two counterparties — a company needing INR↔USDT conversion or INR
              payouts, and a reviewed partner able to fund it — rather than a
              public order book. INRP2P&apos;s role is limited to review, matching
              and introduction: we verify a partner&apos;s entity, banking coverage,
              capacity and compliance readiness, then introduce a qualified fit.
              Everything after that — price, terms, settlement — happens directly
              between the two parties.
            </p>
          </Reveal>

          {/* Stats */}
          <Reveal index={1} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Active partners" value={total} tone="gold" sub={`${verified} fully verified`} />
            <Stat label="Corridors covered" value={corridorsCovered} sub={`of ${DIRECTION_OPTIONS.length}`} />
            <Stat label="Banks covered" value={banksCovered} sub={`of ${BANK_OPTIONS.length} tracked`} />
            <Stat label="Rails covered" value={methodsCovered} sub={`of ${METHOD_OPTIONS.length} tracked`} />
          </Reveal>

          {total < 3 ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">
              INRP2P is in private beta and onboards partners deliberately — small,
              real numbers here, not inflated ones.{" "}
              <Link href="/apply" className="text-gold-600 hover:underline">
                Apply as a partner
              </Link>{" "}
              to help fill a corridor.
            </p>
          ) : null}

          {/* Corridors */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {corridors.map((c, i) => (
              <Reveal key={c.label} index={i + 2} className="card flex h-full flex-col p-5">
                <p className="eyebrow text-leaf-600">{c.label}</p>
                {c.count > 0 ? (
                  <>
                    <p className="mt-2 text-[12.5px] text-slate-500">
                      {c.count} reviewed partner{c.count === 1 ? "" : "s"} active on this corridor.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                          Banks covered
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {c.banks.map((b) => (
                            <span key={b} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                          Rails covered
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {c.methods.map((m) => (
                            <span key={m} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex-1">
                    <EmptyState
                      title="Coverage building"
                      body="No verified partner on this corridor yet. If you can fund it, apply."
                    />
                  </div>
                )}
              </Reveal>
            ))}
          </div>

          {/* Reference rate */}
          <div className="mt-12">
            <p className="eyebrow text-gold-700">
              Reference rate · closed deals, last {rate.windowDays} days
            </p>
            {rate.entries.length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {rate.entries.map((r, i) => (
                  <Reveal key={r.direction} index={i} className="card p-5">
                    <p className="text-[13px] font-semibold text-slate-900">{r.label}</p>
                    <p className="tnum mt-2 text-[22px] font-semibold text-slate-900">
                      ₹{r.min.toFixed(2)} – ₹{r.max.toFixed(2)}
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-500">
                      Median ₹{r.median.toFixed(2)}/USDT · {r.count} closed deal{r.count === 1 ? "" : "s"}
                    </p>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Not enough closed deals yet"
                  body={`A range only publishes once at least ${rate.minSample} deals close on a corridor within ${rate.windowDays} days — real numbers, not a guess.`}
                />
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              Effective settlement rates from closed introductions, not asks or quotes. Not a price feed, not
              investment advice, not a guarantee — see the FAQ below.
            </p>
          </div>

          {/* Mini FAQ */}
          <div className="mt-12">
            <p className="eyebrow">Reading this page</p>
            <div className="mt-4 space-y-4">
              {INDEX_FAQ.map((f, i) => (
                <Reveal key={f.q} index={i} className="card p-5">
                  <p className="text-[13px] font-semibold text-slate-900">{f.q}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{f.a}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <EmbedBadgeSection />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/request" className="btn btn-gold px-5 py-3">
              Submit a request
            </Link>
            <ApplyTraderCta />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
