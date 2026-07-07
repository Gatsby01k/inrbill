import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/lib/options";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "INRP2P — Reviewed INR Liquidity Partners | INR ⇄ USDT & INR Payouts",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const PIPELINE = [
  { step: "Submitted", text: "Your requirements enter the queue with a reference number." },
  { step: "In Review", text: "We review the request and your KYB posture manually." },
  { step: "Matching", text: "Reviewed partners are shortlisted against direction, volume, banks and speed." },
  { step: "Introduced", text: "A qualified, direct introduction. You transact bilaterally." },
];

const FACTS = [
  { value: "24–48h", label: "Manual review of every request" },
  { value: "0", label: "Funds held or moved by INRP2P — ever" },
  { value: "3", label: "Corridors: INR→USDT · USDT→INR · payouts" },
];

const COMPANY_POINTS = [
  "INR → USDT, USDT → INR and INR payout corridors",
  "Partners reviewed on capacity, banking coverage and compliance readiness",
  "Requirements-based matching — not a public order book",
  "Direct introductions; you keep full control of the relationship",
];

const PARTNER_POINTS = [
  "Qualified corporate demand, screened before it reaches you",
  "You set directions, capacity, banks, hours and reserve coverage",
  "Your identity is released only when an introduction is made",
  "No custody, no pooled funds, no platform execution",
];

const PROCESS = [
  {
    n: "01",
    t: "Submit requirements",
    d: "Direction, daily and monthly volume, banks and rails, required speed, jurisdiction and KYC/KYB posture. Ten minutes, once.",
  },
  {
    n: "02",
    t: "Manual review",
    d: "Network operations reviews every request and every partner application by hand. No automated approvals, no pay-to-list.",
  },
  {
    n: "03",
    t: "Matching",
    d: "We shortlist reviewed partners whose declared corridors, capacity, banking coverage and hours actually fit your requirements.",
  },
  {
    n: "04",
    t: "Qualified introduction",
    d: "When both sides fit, we make a direct introduction. From there the relationship — and the settlement — is entirely yours.",
  },
];

const STANDARDS = [
  { title: "Entity & KYB", text: "Registered entity, ownership clarity and KYB documentation availability." },
  { title: "Directions & capacity", text: "Declared corridors with realistic daily capacity bands, not aspirational numbers." },
  { title: "Banking coverage", text: "Named banks and rails: IMPS, NEFT, RTGS, UPI and bulk transfer coverage." },
  { title: "Speed & availability", text: "Working hours and settlement speed commitments that hold under load." },
  { title: "Reserve depth", text: "Declared reserve bands so matches reflect real, available liquidity." },
  { title: "Compliance posture", text: "AML/KYC policy, source-of-funds documentation and reference checks." },
];

const FAQ = [
  {
    q: "Does INRP2P touch funds at any point?",
    a: "No. INRP2P never holds, transmits, converts or custodies funds, and is never a counterparty. We review, match and introduce. Settlement happens directly between the introduced parties under their own agreements.",
  },
  {
    q: "Who qualifies to submit a request?",
    a: "Companies with a real, recurring INR liquidity need and a willingness to complete counterparty KYB. Every request is reviewed manually; we decline requests that don't meet the bar.",
  },
  {
    q: "How fast is an introduction?",
    a: "Requests are reviewed within 24–48 hours. If the network has suitable reviewed partners, shortlisting and introduction typically follow within a few business days.",
  },
  {
    q: "Do you guarantee execution or pricing?",
    a: "No. An introduction is a qualified starting point, not an execution guarantee. Pricing, terms and settlement are agreed directly between you and the partner.",
  },
  {
    q: "How is our information handled?",
    a: "Request details are visible to network operations only. Partner and company identities are exchanged only when an introduction is explicitly released — never before.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "INRP2P",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      email: CONTACT_EMAIL,
      sameAs: [`https://t.me/${CONTACT_TELEGRAM}`],
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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="hero-aurora grid-bg relative overflow-hidden pb-20 pt-36">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
          {/* Ring motif echoing the brand mark */}
          <svg
            className="pointer-events-none absolute -right-40 -top-32 -z-[1] hidden lg:block"
            width="620"
            height="620"
            viewBox="0 0 620 620"
            fill="none"
            aria-hidden
          >
            <circle cx="310" cy="310" r="290" stroke="rgba(238,161,47,0.14)" strokeWidth="1.5" />
            <circle cx="310" cy="310" r="214" stroke="rgba(238,161,47,0.09)" strokeWidth="1.5" />
            <circle cx="310" cy="20" r="7" fill="rgba(238,161,47,0.35)" />
            <circle cx="59" cy="455" r="7" fill="rgba(238,161,47,0.22)" />
            <circle cx="561" cy="455" r="7" fill="rgba(238,161,47,0.22)" />
          </svg>

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <p className="eyebrow reveal">Private INR liquidity network · by application</p>
              <h1 className="reveal reveal-1 mt-5 font-display text-[2.7rem] font-medium leading-[1.04] tracking-[-0.012em] text-slate-900 sm:text-[3.7rem]">
                Reviewed INR liquidity partners.
                <br />
                <span className="text-gold-700">Qualified introductions.</span>
                <br />
                Nothing else.
              </h1>
              <p className="reveal reveal-2 mt-6 max-w-xl text-[15.5px] leading-relaxed text-slate-600">
                A private network for companies that move real INR volume. Every
                partner is reviewed by hand — entity, banks, capacity, reserves,
                compliance — before a single introduction is made. You get a
                vetted counterparty, not a listing. Funds never pass through us.
              </p>
              <div className="reveal reveal-2 mt-5 flex flex-wrap gap-2">
                {["INR → USDT", "USDT → INR", "INR payouts"].map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-slate-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="reveal reveal-2 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/request" className="btn btn-gold px-5 py-3">
                  Request a liquidity partner
                </Link>
                <Link href="/apply" className="btn btn-ghost px-5 py-3">
                  Apply as a liquidity partner
                </Link>
              </div>
              <p className="reveal reveal-3 mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
                Manual review · 24–48h first response · No custody, ever
              </p>
            </div>

            <div className="reveal reveal-2 floaty">
              <div className="card overflow-hidden shadow-raised">
                <div className="flex items-center justify-between border-b border-black/[0.07] bg-black/[0.02] px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <BrandMark size={17} />
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      Request pipeline
                    </p>
                  </div>
                  <span className="rounded border border-black/[0.08] bg-white px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-slate-500">
                    Operated manually
                  </span>
                </div>
                <div className="p-5">
                  <ol>
                    {PIPELINE.map((p, i) => (
                      <li key={p.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 font-mono text-[11px] text-gold-700">
                            {i + 1}
                          </span>
                          {i < PIPELINE.length - 1 ? (
                            <span className="my-1 w-px flex-1 bg-black/[0.09]" />
                          ) : null}
                        </div>
                        <div className={i < PIPELINE.length - 1 ? "pb-5" : ""}>
                          <p className="text-[13px] font-semibold text-slate-900">{p.step}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                            {p.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex items-center gap-2.5 border-t border-emerald-500/25 bg-emerald-500/[0.06] px-5 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[12px] leading-relaxed text-emerald-800">
                    Settlement is always bilateral. INRP2P is never in the flow of funds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Facts strip */}
          <div className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="grid overflow-hidden rounded-xl border border-black/[0.08] bg-white/70 backdrop-blur-sm sm:grid-cols-3">
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
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Two sides ── */}
        <section className="band-white py-24">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-2">
            <Reveal>
              <div className="card h-full p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                <p className="eyebrow">For companies</p>
                <h2 className="mt-3 font-display text-[1.55rem] font-medium leading-snug text-slate-900">
                  Liquidity you can diligence, not a marketplace you gamble on.
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
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="card h-full p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                <p className="eyebrow text-emerald-600">For liquidity partners</p>
                <h2 className="mt-3 font-display text-[1.55rem] font-medium leading-snug text-slate-900">
                  Serious counterparties, without exposing your book to the public.
                </h2>
                <ul className="mt-5 space-y-3">
                  {PARTNER_POINTS.map((t) => (
                    <li key={t} className="flex gap-3 text-[13.5px] leading-relaxed text-slate-600">
                      <span className="mt-[8px] h-1 w-3 shrink-0 rounded-full bg-emerald-500/70" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/apply" className="btn btn-ghost btn-sm mt-6">
                  Apply to join →
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Process ── */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-black/[0.06] py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="eyebrow">Process</p>
              <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                Manual where it matters. Fast where it counts.
              </h2>
            </Reveal>

            {/* Connector rail (desktop) */}
            <Reveal className="mt-12 hidden lg:block">
              <div className="flex items-center px-10">
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
            </Reveal>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS.map((s, i) => (
                <Reveal key={s.n} delay={i * 70}>
                  <div className="card h-full p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
                    <p className="font-mono text-[11px] tracking-wider text-gold-600 lg:hidden">
                      {s.n}
                    </p>
                    <p className="text-[14.5px] font-semibold text-slate-900 lg:mt-0">{s.t}</p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Standards ── */}
        <section id="standards" className="band-white scroll-mt-20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="eyebrow text-emerald-600">Network standards</p>
              <h2 className="mt-3 max-w-2xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                What we review before anyone is introduced.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {STANDARDS.map((s, i) => (
                <Reveal key={s.title} delay={(i % 3) * 70}>
                  <div className="flex gap-3.5">
                    <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-50 text-[11px] text-emerald-600">
                      ✓
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-slate-900">{s.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{s.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── No custody — ink anchor ── */}
        <section id="no-custody" className="band-ink scroll-mt-20 relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
            <BrandMark size={300} />
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                No custody. No execution. By design.
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-[2rem] font-medium leading-snug text-white">
                INRP2P is a coordination layer — never a counterparty.
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-8 grid gap-x-10 gap-y-4 text-[13.5px] leading-relaxed text-slate-400 md:grid-cols-2">
                <p>
                  INRP2P does not move funds, does not custody funds, and does not
                  execute conversion. There are no wallets, no pooled balances, no
                  escrow and no settlement rails on this platform.
                </p>
                <p>
                  INRP2P is not an exchange, OTC desk, wallet provider or payment
                  gateway, and does not act as agent for either side of a
                  transaction.
                </p>
                <p>
                  What we provide is review, matching and qualified introductions.
                  Once introduced, counterparties contract and settle directly,
                  under their own agreements.
                </p>
                <p>
                  Each party remains solely responsible for its own regulatory,
                  tax, KYC/AML and compliance obligations in every jurisdiction it
                  operates in.
                </p>
              </div>
            </Reveal>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        </section>

        {/* ── FAQ ── */}
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal>
              <p className="eyebrow">Questions</p>
              <h2 className="mt-3 font-display text-[2rem] font-medium leading-tight text-slate-900">
                Asked before joining.
              </h2>
            </Reveal>
            <div className="mt-8 space-y-2.5">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} delay={i * 50}>
                  <details className="card group px-5 py-4">
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
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="band-white scroll-mt-20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="hero-aurora card overflow-hidden p-10 text-center sm:p-14">
                <div className="mx-auto flex justify-center">
                  <BrandMark size={40} />
                </div>
                <h2 className="mx-auto mt-5 max-w-xl font-display text-[2rem] font-medium leading-tight text-slate-900">
                  Talk to network operations.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-slate-500">
                  For qualification questions, partner standards or anything that
                  doesn&apos;t fit the forms — reach out directly.
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
                    Telegram · @{CONTACT_TELEGRAM}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
