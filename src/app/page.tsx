import Link from "next/link";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/lib/options";

const PIPELINE = [
  { step: "Submitted", text: "Your requirements enter the queue with a reference number." },
  { step: "In Review", text: "We review the request and your KYB posture manually." },
  { step: "Matching", text: "We shortlist reviewed partners against direction, volume, banks and speed." },
  { step: "Introduced", text: "A qualified, direct introduction is made. You transact bilaterally." },
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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-36 pb-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="eyebrow">Private INR liquidity network</p>
              <h1 className="mt-5 font-display text-4xl leading-[1.08] text-slate-50 sm:text-5xl lg:text-[3.4rem]">
                Reviewed INR liquidity partners.
                <br />
                <span className="text-gold-300">Qualified introductions.</span>
                <br />
                Nothing else.
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-400">
                INRP2P connects qualified companies with manually reviewed INR
                liquidity partners across INR → USDT, USDT → INR and INR payout
                corridors. We review both sides, match on real requirements and
                make direct introductions. We never touch funds.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/request" className="btn btn-gold">
                  Request a liquidity partner
                </Link>
                <Link href="/apply" className="btn btn-ghost">
                  Apply as a liquidity partner
                </Link>
              </div>
              <p className="mt-6 text-xs font-medium tracking-wide text-slate-500">
                Manual review · 24–48h first response · No custody, ever
              </p>
            </div>

            <div className="card p-6 shadow-glow">
              <p className="eyebrow mb-5">How a request moves</p>
              <ol className="space-y-4">
                {PIPELINE.map((p, i) => (
                  <li key={p.step} className="flex gap-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 font-mono text-xs text-gold-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{p.step}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{p.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-emerald-300/90">
                  Settlement is always bilateral. INRP2P is never in the flow of funds.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Two sides */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
            <div className="card p-7">
              <p className="eyebrow">For companies</p>
              <h2 className="mt-3 font-display text-2xl text-slate-50">
                Liquidity you can diligence, not a marketplace you gamble on.
              </h2>
              <ul className="mt-5 space-y-3">
                {COMPANY_POINTS.map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-slate-400">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/request" className="btn btn-ghost btn-sm mt-6">
                Submit a request →
              </Link>
            </div>
            <div className="card p-7">
              <p className="eyebrow text-emerald-400">For liquidity partners</p>
              <h2 className="mt-3 font-display text-2xl text-slate-50">
                Serious counterparties, without exposing your book to the public.
              </h2>
              <ul className="mt-5 space-y-3">
                {PARTNER_POINTS.map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-slate-400">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/apply" className="btn btn-ghost btn-sm mt-6">
                Apply to join →
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-white/5 py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">Process</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl text-slate-50">
              Manual where it matters. Fast where it counts.
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
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
              ].map((s) => (
                <div key={s.n} className="card p-6">
                  <p className="font-mono text-xs text-gold-500">{s.n}</p>
                  <p className="mt-3 text-[15px] font-semibold text-slate-100">{s.t}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standards */}
        <section id="standards" className="border-t border-white/5 py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow text-emerald-400">Network standards</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl text-slate-50">
              What we review before anyone is introduced.
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {STANDARDS.map((s) => (
                <div key={s.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-xs text-emerald-300">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* No custody */}
        <section id="no-custody" className="border-t border-white/5 py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="card border-gold-500/20 p-8 sm:p-10">
              <p className="eyebrow">No custody. No execution. By design.</p>
              <h2 className="mt-4 max-w-3xl font-display text-3xl leading-snug text-slate-50">
                INRP2P is a coordination layer — never a counterparty.
              </h2>
              <div className="mt-8 grid gap-x-10 gap-y-4 text-sm leading-relaxed text-slate-400 md:grid-cols-2">
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
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 font-display text-3xl text-slate-50">Asked before joining.</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="card group px-5 py-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 transition group-open:text-gold-300 [&::-webkit-details-marker]:hidden">
                    {f.q}
                  </summary>
                  <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-white/5 py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="eyebrow">Contact</p>
                <h2 className="mt-3 font-display text-3xl text-slate-50">
                  Talk to network operations.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                  For qualification questions, partner standards or anything that
                  doesn&apos;t fit the forms — reach out directly.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-gold">
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  Telegram · @{CONTACT_TELEGRAM}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
