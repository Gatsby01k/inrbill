import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { Counter, KineticText, Reveal } from "@/components/motion";
import { AiConcierge } from "@/components/site/ai-concierge";
import { ApplyTraderCta } from "@/components/site/apply-trader-cta";
import { HeroRing } from "@/components/site/hero-ring";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { RequestPipelineCard } from "@/components/site/request-pipeline-card";
import { SpotlightCard } from "@/components/site/spotlight-card";
import { Ticker } from "@/components/site/ticker";
import { CORRIDOR_SLUGS } from "@/lib/corridor-page";
import { db } from "@/lib/db";
import { buildCorridorStats } from "@/lib/market-intelligence";
import {
  CONTACT_EMAIL,
  CONTACT_LINKEDIN,
  CONTACT_TELEGRAM,
  CONTACT_TELEGRAM_CHANNEL,
} from "@/lib/options";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

// Refreshed every 15 minutes rather than on every request — a public
// marketing page has no business hitting Postgres per pageview, and the
// numbers below don't need to be second-fresh to be an honest signal.
export const revalidate = 900;

// Below this, a raw partner count reads as "this network is tiny" rather
// than "this network is real" — so the live-stats strip stays hidden until
// there's actually something worth showing. No manual flag to flip later;
// it activates itself the moment the network crosses the line.
const LIVE_STATS_THRESHOLD = 5;

export const metadata: Metadata = {
  title: {
    absolute: "INRP2P — India's Liquidity, Reviewed | INR ⇄ USDT & INR Payouts",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const PROBLEM_PAIRS = [
  {
    old: "Random brokers",
    oldDetail: "Introductions from people with no accountability for who they connect you to.",
    fix: "Every partner manually reviewed",
    fixDetail: "A real person checks entity, capacity and compliance before any introduction.",
  },
  {
    old: "Public Telegram noise",
    oldDetail: "Rates and \"capacity\" posted in open groups, impossible to verify.",
    fix: "Declared coverage, actually verified",
    fixDetail: "Banks, rails and capacity are checked, not just claimed in a chat.",
  },
  {
    old: "Unknown counterparties",
    oldDetail: "No entity checks, no KYB, no way to size real risk before you engage.",
    fix: "Entity and KYB checked first",
    fixDetail: "You never see a name until entity and compliance checks are done.",
  },
  {
    old: "No review trail",
    oldDetail: "Nothing documented — if a deal goes wrong, there is no record of who vetted whom.",
    fix: "Append-only audit trail",
    fixDetail: "Every submission, decision and status change is recorded, end to end.",
  },
  {
    old: "Poor follow-up",
    oldDetail: "Interest goes cold. No one owns the introduction through to a real conversation.",
    fix: "One person owns your request",
    fixDetail: "First response within 24–48h, tracked through to a qualified introduction.",
  },
];

const FACTS = [
  { value: "24–48h", label: "First response. Not “soon.”" },
  { value: "Never", label: "Custody of your funds. They pass directly, partner to partner" },
  { value: "3", label: "Corridors: INR→USDT, USDT→INR, INR payouts" },
];

// Real infrastructure INRP2P is actually wired into for its OWN service-fee
// invoicing (see src/lib/razorpay.ts, src/lib/nowpayments.ts) — not vanity
// logos, and never the liquidity deal itself (that still settles directly
// between company and partner, no custody, same as everywhere else on this
// page). Append here as more get integrated — the ticker below just maps
// over this list, nothing else to touch.
const POWERED_BY = ["Razorpay", "NOWPayments"];

const COMPANY_POINTS = [
  "Coverage across INR → USDT, USDT → INR and INR payouts",
  "Every partner verified for capacity, banking coverage and compliance",
  "Matching runs on your requirements, not a public order book",
  "You deal with the partner directly after the introduction",
];

const PARTNER_POINTS = [
  "Corporate requests are screened before they reach you",
  "You set your directions, capacity, banks, hours and reserves",
  "Your identity is only shared when an introduction is made",
  "No custody, no pooled funds, no platform execution",
];

const PROCESS = [
  {
    t: "Submit your requirement",
    d: "Direction, daily and monthly volume, banks, rails, required speed and jurisdiction. One form.",
  },
  {
    t: "Manual review",
    d: "A person reviews every request and every partner application. No automated approvals, no paid listings.",
  },
  {
    t: "Matching",
    d: "We shortlist partners whose verified capacity, banking coverage and working hours fit your requirement.",
  },
  {
    t: "Direct introduction",
    d: "When both sides confirm fit, we introduce you. Pricing and settlement are agreed between you and the partner.",
  },
];

const STANDARDS = [
  { title: "Entity & KYB", text: "Registered entity, ownership clarity and KYB documentation." },
  { title: "Directions & capacity", text: "Declared corridors with realistic daily capacity bands." },
  { title: "Banking coverage", text: "Named banks and rails: IMPS, NEFT, RTGS, UPI, bulk transfers." },
  { title: "Speed & availability", text: "Working hours and settlement speed that hold under load." },
  { title: "Reserve depth", text: "Declared reserve bands, so matches reflect available liquidity." },
  { title: "Compliance", text: "AML/KYC policy, source-of-funds documentation, reference checks." },
];

const FAQ = [
  {
    q: "What is INR P2P trading?",
    a: "INR P2P (peer-to-peer) trading is a direct exchange of Indian Rupees for an asset like USDT between two counterparties, without a public order book or exchange as the other side of the trade. INRP2P reviews and introduces the counterparties — it does not operate an order book, hold funds, or set the rate.",
  },
  {
    q: "What is an INR liquidity partner?",
    a: "An INR liquidity partner is a reviewed desk, payout operator or trading team that can move real volume in INR — via bank rails like IMPS, NEFT, RTGS or UPI — against USDT or as INR payouts, on a declared schedule and capacity. INRP2P verifies a partner's entity, banking coverage, capacity and compliance readiness before any introduction is made.",
  },
  {
    q: "How do USDT to INR P2P payouts work in India?",
    a: "A company submits its requirement — direction, volume, banks, required speed and jurisdiction — to INRP2P. After manual review, it is matched against verified partners whose declared coverage fits. Once introduced, the company and partner agree pricing and settlement directly and transact under their own arrangement; INRP2P is not a party to the transfer.",
  },
  {
    q: "Does INRP2P touch funds at any point?",
    a: "No. INRP2P never holds, transmits, converts or custodies funds, and is never a counterparty. We review, match and introduce. Settlement happens directly between the introduced parties under their own agreements.",
  },
  {
    q: "Who qualifies to submit a request?",
    a: "Companies with a real, recurring INR liquidity need that are willing to complete counterparty KYB. Every request is reviewed by a person, and requests that do not qualify are declined.",
  },
  {
    q: "How fast is an introduction?",
    a: "Requests receive a first response within 24–48 hours. If the network has suitable verified partners, shortlisting and introduction usually follow within a few business days.",
  },
  {
    q: "Do you guarantee execution or pricing?",
    a: "No. An introduction is a qualified starting point, not an execution guarantee. Pricing, terms and settlement are agreed directly between you and the partner.",
  },
  {
    q: "How is our information handled?",
    a: "Request details are visible to network operations only. Partner and company identities are exchanged only when an introduction is explicitly released, never before.",
  },
  {
    q: "Can I get a rate estimate before submitting a request?",
    a: "Each corridor page (INR → USDT, USDT → INR, INR payouts) shows a reference range built from real closed deals, plus a quick tool that hands you a pre-filled form for your volume and speed. It is not a quote — actual pricing is agreed directly with the partner you are introduced to.",
  },
  {
    q: "Is there a faster way to figure out which form I need?",
    a: "Yes — the chat in the corner of this page asks a couple of quick questions (are you a company or a partner, what corridor, roughly what volume) and hands you a pre-filled form instead of a blank one. It cannot submit anything on your behalf; every submission still goes through the same manual review.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "INRP2P",
      alternateName: "INR P2P",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      email: CONTACT_EMAIL,
      areaServed: { "@type": "Country", name: "India" },
      knowsAbout: [
        "INR P2P trading",
        "USDT to INR liquidity",
        "INR to USDT liquidity",
        "INR payouts",
        "P2P India",
        "OTC INR liquidity",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: CONTACT_EMAIL,
        contactType: "customer service",
        availableLanguage: ["English"],
      },
      sameAs: [
        CONTACT_LINKEDIN,
        `https://t.me/${CONTACT_TELEGRAM}`,
        `https://t.me/${CONTACT_TELEGRAM_CHANNEL}`,
      ],
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "INRP2P — Private INR Liquidity Network",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default async function LandingPage() {
  const [verifiedPartners, successfulIntros, corridorStats] = await Promise.all([
    db.partnerProfile.count({ where: { status: { in: ["VERIFIED", "LIMITED"] } } }),
    db.introduction.count({ where: { status: "SUCCESSFUL" } }),
    buildCorridorStats(),
  ]);
  const showLiveStats = verifiedPartners >= LIVE_STATS_THRESHOLD;
  // buildCorridorStats() returns entries in the same fixed order
  // (INR_TO_USDT, USDT_TO_INR, INR_PAYOUTS) as CORRIDOR_SLUGS, so they're
  // zipped by index rather than re-fetching per corridor.
  const corridors = corridorStats.map((s, i) => ({
    ...s,
    slug: CORRIDOR_SLUGS[i],
    growthPct:
      s.requestsPrior14d > 0
        ? Math.round(((s.requestsLast14d - s.requestsPrior14d) / s.requestsPrior14d) * 100)
        : null,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="hero-aurora relative overflow-hidden pb-20 pt-36">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-gradient-shift bg-gradient-to-r from-gold-500/10 via-gold-500/70 to-leaf-500/20 bg-[length:200%_200%]" />
          <HeroRing />

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.12fr_0.88fr]">
            <Reveal>
              <p className="eyebrow">INRP2P — private, reviewed network</p>
              <KineticText
                as="h1"
                text="India's liquidity, reviewed."
                highlight={["reviewed"]}
                className="mt-5 font-display text-[2.85rem] font-medium leading-[1.06] tracking-[-0.018em] text-slate-900 sm:text-[3.75rem]"
              />
              <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-slate-600">
                Every liquidity partner is manually reviewed before you ever see their
                name — entity, banking coverage, capacity, compliance. We never touch
                your money. No custody, no execution, ever. First response in
                24–48 hours, for INR to USDT, USDT to INR and INR payouts.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["INR → USDT", "USDT → INR", "INR payouts"].map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-slate-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/request" className="btn btn-gold px-5 py-3">
                  Submit company request
                </Link>
                <ApplyTraderCta />
              </div>
              <p className="mt-4 text-[12px] text-slate-400">
                Not sure which corridor fits? Chat with the concierge in the corner — it hands
                you a pre-filled form, it doesn&apos;t submit anything for you.
              </p>
            </Reveal>

            <Reveal index={2}>
              <RequestPipelineCard />
            </Reveal>
          </div>

          {/* Facts */}
          <div className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
            <Reveal
              index={3}
              className="grid overflow-hidden rounded-xl border border-black/[0.08] bg-white/70 backdrop-blur-sm sm:grid-cols-3"
            >
              {FACTS.map((f, i) => (
                <div
                  key={f.value}
                  className={
                    i > 0
                      ? "border-t border-black/[0.06] px-6 py-5 sm:border-l sm:border-t-0"
                      : "px-6 py-5"
                  }
                >
                  <p className="tnum font-display text-[28px] font-medium text-slate-900">
                    {f.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.label}</p>
                </div>
              ))}
            </Reveal>
            {showLiveStats ? (
              <Reveal
                index={4}
                className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-slate-500"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-leaf-500" />
                  </span>
                  <Counter value={verifiedPartners} className="tnum font-semibold text-slate-800" />{" "}
                  verified partners in the network
                </span>
                {successfulIntros > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-300">·</span>
                    <Counter value={successfulIntros} className="tnum font-semibold text-slate-800" />{" "}
                    successful introductions
                  </span>
                ) : null}
              </Reveal>
            ) : null}
            <Reveal index={5} className="mt-4 text-center">
              <Link
                href="/inr-p2p-index"
                className="text-[12px] font-medium text-slate-500 transition-colors hover:text-gold-700"
              >
                See live corridor, bank and rail coverage on the liquidity index →
              </Link>
            </Reveal>
          </div>

          <div className="mt-14">
            <Ticker
              items={[
                "India's liquidity, reviewed.",
                ...POWERED_BY.map((p) => `Service fees invoiced via ${p} — never the deal itself`),
                "24–48h first response — not “soon.”",
                "Zero custody, always — funds never pass through INRP2P",
                "Every request and every application manually reviewed",
                "3 corridors: INR→USDT, USDT→INR, INR payouts",
              ]}
            />
          </div>
        </section>

        {/* ── Problem ── */}
        <section className="band-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">The problem today</p>
            <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
              A stranger in a chat, a rate that isn&apos;t real, and silence the moment it
              matters.
            </h2>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
              That&apos;s still how most INR liquidity deals get made in India — cold
              brokers, public Telegram groups, forwarded contacts. No way to check
              who you&apos;re actually dealing with before you send money.
            </p>
            <div className="mt-10 flex items-center gap-6 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Old way
              </p>
              <span className="h-px flex-1 bg-gradient-to-r from-rose-300/40 to-transparent" />
              <span aria-hidden className="text-slate-300">
                →
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-leaf-400/40 to-transparent" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-leaf-600">
                With INRP2P
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {PROBLEM_PAIRS.map((p, i) => (
                <Reveal key={p.old} index={i}>
                  <SpotlightCard className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                    <div className="flex flex-1 items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-300/60 bg-rose-50 text-[10px] text-rose-500">
                        ✕
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-slate-500 line-through decoration-rose-300/70">
                          {p.old}
                        </p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
                          {p.oldDetail}
                        </p>
                      </div>
                    </div>
                    <span aria-hidden className="hidden shrink-0 text-slate-300 sm:block">
                      →
                    </span>
                    <div className="flex flex-1 items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-leaf-400/50 bg-leaf-50 text-[10px] text-leaf-600">
                        ✓
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-slate-900">{p.fix}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                          {p.fixDetail}
                        </p>
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Two sides ── */}
        <section className="band-white py-24">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-2">
            <Reveal index={0}>
              <SpotlightCard className="card h-full p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                <p className="eyebrow">For companies</p>
                <h2 className="mt-3 font-display text-[1.55rem] font-medium leading-snug text-slate-900">
                  Liquidity you don&apos;t have to gamble on.
                </h2>
                <ul className="mt-5 space-y-3">
                  {COMPANY_POINTS.map((t) => (
                    <li key={t} className="flex gap-3 text-[13.5px] leading-relaxed text-slate-600">
                      <span className="mt-[8px] h-1 w-3 shrink-0 rounded-full bg-gold-500/70" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/request" className="btn btn-ghost btn-sm mt-6">
                  Submit a request →
                </Link>
              </SpotlightCard>
            </Reveal>
            <Reveal index={1}>
              <SpotlightCard className="card h-full p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                <p className="eyebrow text-leaf-600">For liquidity partners</p>
                <h2 className="mt-3 font-display text-[1.55rem] font-medium leading-snug text-slate-900">
                  Qualified demand. Never a public listing.
                </h2>
                <ul className="mt-5 space-y-3">
                  {PARTNER_POINTS.map((t) => (
                    <li key={t} className="flex gap-3 text-[13.5px] leading-relaxed text-slate-600">
                      <span className="mt-[8px] h-1 w-3 shrink-0 rounded-full bg-leaf-500/70" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/apply" className="btn btn-ghost btn-sm mt-6">
                  Apply to join →
                </Link>
              </SpotlightCard>
            </Reveal>
          </div>
        </section>

        {/* ── Corridors (live network data) ── */}
        <section className="border-t border-black/[0.06] py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-gold-700">Live network data · updated hourly</p>
                <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                  Real coverage, not a directory.
                </h2>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-500">
                  Each corridor page below is a live snapshot of currently-active, verified
                  partners — not a listing anyone can pay into.
                </p>
              </div>
              <Link href="/corridors" className="btn btn-ghost btn-sm">
                All corridors →
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {corridors.map((c, i) => (
                <Reveal key={c.slug} index={i}>
                  <SpotlightCard className="card flex h-full flex-col p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                    <p className="eyebrow text-leaf-600">{c.directionLabel}</p>
                    {c.activePartners > 0 ? (
                      <>
                        <p className="tnum mt-3 text-[28px] font-semibold text-slate-900">
                          {c.activePartners}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          active reviewed partner{c.activePartners === 1 ? "" : "s"}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[11.5px] text-slate-500">
                          <span>
                            {c.requestsLast14d} request{c.requestsLast14d === 1 ? "" : "s"} · 14d
                          </span>
                          {c.growthPct !== null ? (
                            <span
                              className={
                                c.growthPct >= 0
                                  ? "font-medium text-leaf-600"
                                  : "font-medium text-rose-500"
                              }
                            >
                              {c.growthPct >= 0 ? "▲" : "▼"} {Math.abs(c.growthPct)}%
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900">Coverage building</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                          No verified partner on this corridor yet. Be the first.
                        </p>
                      </div>
                    )}
                    <Link href={`/corridors/${c.slug}`} className="btn btn-ghost btn-sm mt-5">
                      View corridor →
                    </Link>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Process ── */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-black/[0.06] py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">Process</p>
            <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-500">
              Every submission, review decision and status change is recorded in an
              append-only audit trail — nothing here is a black box.
            </p>

            <div className="mt-12 hidden items-center px-10 lg:flex">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-1 items-center last:flex-none">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-500/50 bg-gold-500/10 font-mono text-[11px] font-semibold text-gold-700">
                    {i + 1}
                  </span>
                  {i < 3 ? (
                    <span className="mx-2 h-px flex-1 bg-gradient-to-r from-gold-500/40 to-gold-500/10" />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS.map((s, i) => (
                <Reveal key={s.t} index={i}>
                  <SpotlightCard className="card h-full p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                    <p className="font-mono text-[11px] tracking-wider text-gold-600 lg:hidden">
                      0{i + 1}
                    </p>
                    <p className="text-[14.5px] font-semibold text-slate-900">{s.t}</p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{s.d}</p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flow ── */}
        <section className="border-t border-black/[0.06] py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">From submission to introduction</p>
            <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
              Company flow &amp; partner flow
            </h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal index={0}>
                <SpotlightCard className="card p-6 sm:p-7">
                  <p className="eyebrow">Company</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {["Submit request", "Manual review", "Matching", "Qualified introduction"].map((step, i, arr) => (
                      <span key={step} className="flex items-center gap-2">
                        <span className="chip border-gold-500/35 bg-gold-500/[0.08] text-gold-700">
                          {step}
                        </span>
                        {i < arr.length - 1 ? (
                          <span aria-hidden className="text-slate-300">
                            →
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-[12.5px] leading-relaxed text-slate-500">
                    One structured form, a real reviewer, and a shortlist built on your
                    volume, banks and speed — not whoever answered first in a chat.
                  </p>
                  <Link href="/request" className="btn btn-ghost btn-sm mt-5">
                    Submit company request →
                  </Link>
                </SpotlightCard>
              </Reveal>
              <Reveal index={1}>
                <SpotlightCard className="card p-6 sm:p-7">
                  <p className="eyebrow text-leaf-600">Partner</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {["Apply", "Manual review", "Verification", "Matched demand"].map((step, i, arr) => (
                      <span key={step} className="flex items-center gap-2">
                        <span className="chip border-leaf-400/40 bg-leaf-50 text-leaf-700">
                          {step}
                        </span>
                        {i < arr.length - 1 ? (
                          <span aria-hidden className="text-slate-300">
                            →
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-[12.5px] leading-relaxed text-slate-500">
                    Declare your directions, capacity and coverage once. Verified
                    status makes you eligible for qualified demand — no public
                    listing, no cold inbound.
                  </p>
                  <Link href="/apply" className="btn btn-ghost btn-sm mt-5">
                    Apply for Trader Review →
                  </Link>
                </SpotlightCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Standards ── */}
        <section id="standards" className="band-white scroll-mt-20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-leaf-600">Network standards</p>
                <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                  What we verify before an introduction
                </h2>
              </div>
              <Link href="/partner-review" className="btn btn-ghost btn-sm">
                Full review framework →
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STANDARDS.map((s, i) => (
                <Reveal key={s.title} index={i}>
                  <SpotlightCard className="card flex h-full gap-3.5 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                    <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-leaf-400/50 bg-leaf-50 text-[12px] text-leaf-600 animate-pop-in">
                      ✓
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-slate-900">{s.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{s.text}</p>
                    </div>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── No custody ── */}
        <section id="no-custody" className="band-ink scroll-mt-20 relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
            <BrandMark size={300} />
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
              Compliance position
            </p>
            <KineticText
              as="h2"
              text="We never touch your money. Not once."
              highlight={["once"]}
              className="mt-4 max-w-3xl font-display text-[2.6rem] font-medium leading-[1.05] tracking-[-0.015em] text-white sm:text-[3.4rem]"
            />
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "No custody of funds",
                "No execution of payments or payouts",
                "No exchange or trading venue",
                "No guaranteed liquidity or completion",
              ].map((t, i) => (
                <Reveal
                  key={t}
                  index={i}
                  className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors duration-300 hover:border-rose-400/30"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/40 text-[10px] text-rose-300">
                    ✕
                  </span>
                  <span className="text-[12.5px] font-medium text-slate-200">{t}</span>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 grid gap-x-10 gap-y-4 text-[13.5px] leading-relaxed text-slate-400 md:grid-cols-2">
              <p>
                There are no wallets, no pooled balances, no escrow and no
                settlement rails on this platform. INRP2P is never a counterparty
                to any transaction.
              </p>
              <p>
                INRP2P is not an exchange, OTC desk, wallet provider or payment
                gateway, and does not act as agent for either side of a
                transaction.
              </p>
              <p>
                The service is review, matching and introductions. Once
                introduced, counterparties contract and settle directly, under
                their own agreements.
              </p>
              <p>
                Each party remains solely responsible for its own regulatory,
                tax and KYC/AML obligations in every jurisdiction it operates in.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/disclaimer"
                className="text-[12.5px] font-medium text-gold-400 transition-colors hover:text-gold-300"
              >
                Read the full disclaimer →
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-leaf-500/45 to-transparent" />
        </section>

        {/* ── FAQ ── */}
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 font-display text-[2rem] font-medium leading-tight text-slate-900">
              Frequently asked questions
            </h2>
            <div className="mt-8 space-y-2.5">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} as="details" index={i} className="card group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-semibold text-slate-800 transition-colors group-open:text-gold-700 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden
                      className="text-slate-400 transition-transform duration-200 group-open:rotate-45 group-open:text-gold-600"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-[12.5px] leading-relaxed text-slate-500">
                    {f.a}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Private beta ── */}
        <section className="band-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="card flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <p className="eyebrow">Private beta</p>
                <h2 className="mt-3 max-w-xl font-display text-[1.7rem] font-medium leading-snug text-slate-900">
                  Onboarding a limited number of companies and partners.
                </h2>
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-slate-500">
                  INRP2P is in private beta. Every request and application is
                  reviewed personally, so we keep volume in step with our review
                  capacity — access is not automatic, and not guaranteed.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link href="/request" className="btn btn-gold px-5 py-3">
                  Submit company request
                </Link>
                <ApplyTraderCta />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="band-white scroll-mt-20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="hero-aurora card overflow-hidden p-10 text-center sm:p-14">
              <div className="mx-auto flex justify-center">
                <BrandMark size={40} />
              </div>
              <h2 className="mx-auto mt-5 max-w-xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                Speak to the operations team
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-slate-500">
                For qualification questions, partner standards or anything that
                does not fit the forms.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-gold px-5 py-3">
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost px-5 py-3"
                >
                  Telegram (CEO) · @{CONTACT_TELEGRAM}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM_CHANNEL}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost px-5 py-3"
                >
                  Channel · @{CONTACT_TELEGRAM_CHANNEL}
                </a>
                <a
                  href={CONTACT_LINKEDIN}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost px-5 py-3"
                >
                  LinkedIn
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AiConcierge />
    </div>
  );
}
