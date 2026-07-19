import type { Metadata } from "next";
import { Reveal } from "@/components/motion";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { CONTACT_EMAIL } from "@/lib/options";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Careers — build India's private liquidity network",
  description:
    "Join INRP2P across INR liquidity trading, network operations, counterparty risk and institutional partnerships.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers at INRP2P",
    description: "Build the trust and operating layer for India's private liquidity market.",
    url: `${SITE_URL}/careers`,
  },
};

const ROLES = [
  {
    id: "inr-liquidity-trader",
    title: "INR Liquidity Trader",
    team: "Liquidity operations",
    location: "India · Remote-first",
    engagement: "Full-time / contract",
    summary:
      "Run the live operating picture behind INR ↔ USDT and INR payout requirements: real capacity, banking rails, timing and counterparty readiness.",
    mandate: [
      "Maintain an accurate view of partner capacity, supported banks, rails and operating hours.",
      "Build requirement-led shortlists across direction, ticket size, timing and settlement constraints.",
      "Coordinate readiness between reviewed counterparties without taking custody of transaction funds.",
      "Record outcomes, failed assumptions and operational incidents with zero volume theatre.",
    ],
    signals: [
      "Hands-on experience in India-focused P2P, OTC, treasury or liquidity operations.",
      "Working knowledge of IMPS, NEFT, RTGS, UPI and operational bank-risk patterns.",
      "Calm judgement under time pressure and precise written communication.",
      "A verifiable track record matters more than a polished job title.",
    ],
  },
  {
    id: "liquidity-operations-associate",
    title: "Liquidity Operations Associate",
    team: "Network operations",
    location: "India · Remote-first",
    engagement: "Full-time",
    summary:
      "Keep requests moving cleanly from intake to review, matching and controlled introduction while every decision remains accountable.",
    mandate: [
      "Review new company requirements and partner capacity updates for completeness.",
      "Keep queues, response timelines, introductions and follow-ups current.",
      "Escalate inconsistencies instead of silently pushing weak requests through.",
      "Improve operating playbooks as recurring edge cases become visible.",
    ],
    signals: [
      "One or more years in fintech, payments, brokerage operations or customer operations.",
      "Strong ownership of detail, deadlines and structured records.",
      "Comfort working directly with founders and external counterparties.",
      "Clear English; Hindi or another Indian language is useful, not mandatory.",
    ],
  },
  {
    id: "counterparty-risk-analyst",
    title: "Counterparty Risk Analyst",
    team: "Trust & controls",
    location: "India · Remote",
    engagement: "Contract / part-time path",
    summary:
      "Turn identity, entity, banking and operating evidence into defensible human decisions — never automatic approvals.",
    mandate: [
      "Review KYB, identity, bank, wallet and operating evidence against a consistent standard.",
      "Document approval, limitation and rejection rationales that another operator can audit.",
      "Monitor expiry, changed capacity and incident signals after onboarding.",
      "Help strengthen evidence handling and fraud-escalation procedures.",
    ],
    signals: [
      "Experience in KYB/KYC, transaction monitoring, fraud operations or counterparty review.",
      "Good understanding of Indian entity and banking documentation.",
      "Able to distinguish missing evidence from genuinely adverse evidence.",
      "High discretion with restricted personal and company information.",
    ],
  },
  {
    id: "institutional-partnerships-lead",
    title: "Institutional Partnerships Lead",
    team: "Founder office",
    location: "India / UAE · Remote-first",
    engagement: "Contract → full-time",
    summary:
      "Build trusted demand and supply relationships with companies, OTC desks, payout operators and infrastructure partners.",
    mandate: [
      "Source qualified company demand and credible liquidity partners in priority corridors.",
      "Run high-signal discovery without promising liquidity, pricing or guaranteed outcomes.",
      "Turn market feedback into sharper positioning, onboarding and partnership strategy.",
      "Own relationship quality from first conversation through a successful introduction.",
    ],
    signals: [
      "Existing relationships across payments, fintech, treasury, OTC or digital-asset infrastructure.",
      "Evidence of consultative B2B selling rather than high-volume cold outreach.",
      "Commercial instinct paired with disciplined compliance boundaries.",
      "Excellent written follow-up and founder-level accountability.",
    ],
  },
] as const;

const VALUES = [
  ["01", "Proof over posture", "We care about what you have operated, fixed or learned — not inflated titles or anonymous volume claims."],
  ["02", "Judgement over speed", "Moving quickly matters. Knowing when to pause, verify or decline matters more."],
  ["03", "Write it down", "Capacity, decisions and incidents must survive beyond a call or Telegram thread."],
  ["04", "Boundaries are product", "No custody of deal funds, no guaranteed liquidity and no ambiguity about who is accountable."],
] as const;

function applicationHref(role: (typeof ROLES)[number]) {
  const subject = `Application — ${role.title}`;
  const body = [
    `I am applying for: ${role.title}`,
    "",
    "Name:",
    "Current city / time zone:",
    "LinkedIn profile:",
    "Relevant experience:",
    "One result or operating problem I can explain:",
    "Availability:",
    "",
    "CV or supporting links can be attached to this email. Please do not attach identity or banking documents.",
  ].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Arrow() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CareersPage() {
  const jobPostingGraph = ROLES.map((role) => ({
    "@type": "JobPosting",
    title: role.title,
    description: `${role.summary} ${role.mandate.join(" ")}`,
    identifier: { "@type": "PropertyValue", name: "INRP2P", value: role.id },
    datePosted: "2026-07-19",
    validThrough: "2026-09-30T23:59:59+05:30",
    employmentType: role.engagement.includes("/") ? ["FULL_TIME", "CONTRACTOR"] : role.engagement.includes("Full-time") ? "FULL_TIME" : "CONTRACTOR",
    hiringOrganization: { "@type": "Organization", name: "INRP2P", sameAs: SITE_URL },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: role.location.includes("UAE")
      ? [{ "@type": "Country", name: "India" }, { "@type": "Country", name: "United Arab Emirates" }]
      : { "@type": "Country", name: "India" },
    directApply: true,
    url: `${SITE_URL}/careers#${role.id}`,
  }));

  return (
    <div className="marketing-site v3-site min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": jobPostingGraph }) }} />
      <SiteNav />
      <main>
        <section className="relative isolate overflow-hidden border-b border-[#07152e]/10 bg-[#f8f3eb] pt-[70px]">
          <div className="pointer-events-none absolute -right-40 -top-44 -z-10 h-[720px] w-[720px] rounded-full border border-[#d9901c]/15 shadow-[0_0_0_90px_rgba(217,144,28,.025),0_0_0_180px_rgba(217,144,28,.018)]" />
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_24%,rgba(238,148,20,.15),transparent_30%),linear-gradient(118deg,#fbf8f3_0%,#f4ecdf_100%)]" />
          <div className="mx-auto grid min-h-[650px] max-w-[1280px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:py-28">
            <div className="max-w-[790px]">
              <p className="fin-kicker"><span /> Careers at INRP2P</p>
              <h1 className="mt-8 font-display text-[clamp(3.6rem,6vw,6.6rem)] font-medium leading-[.9] tracking-[-.058em] text-[#07152e]">
                Build the trust layer for India&apos;s <em className="font-normal text-[#d77707]">liquidity market.</em>
              </h1>
              <p className="mt-8 max-w-[670px] text-[14px] leading-7 text-[#5d697d] sm:text-[15px]">
                We are building a small, high-accountability operating team across liquidity, network operations, counterparty risk and institutional relationships. Early hires shape the system, not just a job description.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#open-roles" className="fin-btn fin-btn-primary">View open roles <Arrow /></a>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Careers at INRP2P — general introduction")}`} className="fin-btn fin-btn-secondary">Send a general introduction</a>
              </div>
            </div>

            <Reveal className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07152e] text-white shadow-[0_42px_90px_-52px_rgba(7,21,46,.85)]">
              <div className="border-b border-white/10 p-7">
                <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#ffad32]">Hiring signal · July 2026</p>
                <p className="mt-6 text-6xl font-medium tracking-[-.06em]">04</p>
                <p className="mt-2 text-xs text-slate-400">Open operating roles</p>
              </div>
              <div className="divide-y divide-white/10">
                <div className="grid grid-cols-[95px_1fr] gap-4 px-7 py-4 text-[10px]"><span className="uppercase tracking-[.14em] text-slate-500">Model</span><strong className="font-medium text-white">Remote-first</strong></div>
                <div className="grid grid-cols-[95px_1fr] gap-4 px-7 py-4 text-[10px]"><span className="uppercase tracking-[.14em] text-slate-500">Core hours</span><strong className="font-medium text-white">India market</strong></div>
                <div className="grid grid-cols-[95px_1fr] gap-4 px-7 py-4 text-[10px]"><span className="uppercase tracking-[.14em] text-slate-500">Environment</span><strong className="font-medium text-white">Founder-led · early stage</strong></div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="open-roles" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
          <div className="grid items-end gap-8 border-b border-[#07152e]/10 pb-10 lg:grid-cols-[1fr_.55fr]">
            <div>
              <p className="fin-kicker"><span /> Open roles</p>
              <h2 className="mt-6 max-w-[760px] font-display text-[44px] font-medium leading-[.98] tracking-[-.045em] text-[#07152e] sm:text-[60px]">Small team. Real operating responsibility.</h2>
            </div>
            <p className="max-w-[430px] text-[13px] leading-6 text-[#667287] lg:justify-self-end">These are hands-on roles. You will work close to live requirements, real counterparties and decisions that must remain explainable.</p>
          </div>

          <div className="mt-10 space-y-4">
            {ROLES.map((role, index) => (
              <div id={role.id} key={role.id} className="scroll-mt-28">
              <Reveal as="details" index={index} className="group overflow-hidden rounded-[22px] border border-[#07152e]/10 bg-white shadow-[0_24px_60px_-48px_rgba(7,21,46,.38)] open:border-[#d98516]/30">
                <summary className="grid cursor-pointer list-none gap-6 p-5 marker:content-none sm:p-7 lg:grid-cols-[54px_minmax(0,1fr)_210px_42px] lg:items-center [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[10px] font-semibold text-[#c56f08]">0{index + 1}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[27px] font-medium tracking-[-.035em] text-[#07152e] sm:text-[31px]">{role.title}</h3>
                      <span className="rounded-full border border-emerald-600/20 bg-emerald-50 px-2 py-1 text-[8px] font-semibold uppercase tracking-[.12em] text-emerald-700">Open</span>
                    </div>
                    <p className="mt-2 max-w-[720px] text-[12px] leading-6 text-[#687487]">{role.summary}</p>
                  </div>
                  <div className="text-[10px] leading-5 text-slate-500">
                    <p className="font-semibold text-[#26354d]">{role.location}</p>
                    <p>{role.engagement}</p>
                    <p className="text-[#b96908]">{role.team}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#07152e]/10 text-xl font-light text-[#07152e] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-[#07152e]/10 bg-[#fbf7f0] px-5 py-7 sm:px-7 lg:grid lg:grid-cols-2 lg:gap-14 lg:px-[81px] lg:py-10">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#b96908]">Your mandate</p>
                    <ul className="mt-5 space-y-3">
                      {role.mandate.map((item) => <li key={item} className="flex gap-3 text-[12px] leading-6 text-[#59667a]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e58c17]" />{item}</li>)}
                    </ul>
                  </div>
                  <div className="mt-8 lg:mt-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#b96908]">Signals of fit</p>
                    <ul className="mt-5 space-y-3">
                      {role.signals.map((item) => <li key={item} className="flex gap-3 text-[12px] leading-6 text-[#59667a]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-[#e58c17]" />{item}</li>)}
                    </ul>
                  </div>
                  <div className="mt-8 flex flex-col gap-3 border-t border-[#07152e]/10 pt-6 sm:flex-row sm:items-center lg:col-span-2">
                    <a href={applicationHref(role)} className="fin-btn fin-btn-primary">Apply for this role <Arrow /></a>
                    <p className="text-[10px] leading-5 text-slate-500">Include LinkedIn or a CV and one result you can explain in detail.</p>
                  </div>
                </div>
              </Reveal>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[#07152e]/10 bg-[#f2e9dc]">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:py-32">
            <p className="fin-kicker"><span /> How we work</p>
            <div className="mt-10 grid border-y border-[#07152e]/10 md:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(([number, title, body]) => (
                <div key={number} className="border-b border-[#07152e]/10 py-8 md:px-7 md:first:pl-0 lg:min-h-[270px] lg:border-b-0 lg:border-r lg:last:border-r-0 lg:last:pr-0">
                  <span className="font-mono text-[9px] font-semibold text-[#bd6b08]">{number}</span>
                  <h3 className="mt-12 font-display text-[25px] font-medium tracking-[-.035em] text-[#07152e]">{title}</h3>
                  <p className="mt-4 text-[11px] leading-6 text-[#687487]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#07152e] text-white">
          <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-32">
            <div>
              <p className="fin-kicker fin-kicker-dark"><span /> Hiring process</p>
              <h2 className="mt-7 font-display text-[44px] font-medium leading-[.98] tracking-[-.045em] sm:text-[58px]">Direct, practical and respectful.</h2>
              <p className="mt-6 max-w-[470px] text-[12px] leading-6 text-slate-400">No generic unpaid take-home projects. If we need an extended working trial, it is scoped and paid.</p>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {[
                ["01", "Signal", "Send your profile and one relevant result or operating problem you can explain."],
                ["02", "Operating conversation", "A direct conversation about judgement, constraints and how you actually work."],
                ["03", "Practical case", "A short role-specific scenario using fictional data — never live customer information."],
                ["04", "Decision", "Clear scope, engagement model and compensation discussion before either side commits."],
              ].map(([number, title, body]) => (
                <div key={number} className="grid gap-3 py-6 sm:grid-cols-[48px_160px_1fr] sm:items-start">
                  <span className="font-mono text-[9px] text-[#ffad32]">{number}</span>
                  <strong className="text-[12px] font-semibold">{title}</strong>
                  <p className="text-[11px] leading-5 text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#faf5ed] px-5 py-24 text-center sm:px-8 lg:py-32">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9901c]/15 shadow-[0_0_0_70px_rgba(217,144,28,.03),0_0_0_140px_rgba(217,144,28,.02)]" />
          <div className="mx-auto flex max-w-[800px] flex-col items-center">
            <p className="fin-kicker"><span /> Don&apos;t see your exact role?</p>
            <h2 className="mt-7 font-display text-[44px] font-medium leading-[.98] tracking-[-.045em] text-[#07152e] sm:text-[62px]">Show us where you create leverage.</h2>
            <p className="mt-6 max-w-[610px] text-[13px] leading-7 text-[#667287]">Send a concise introduction, the market problem you understand unusually well and evidence of what you have already operated.</p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Careers at INRP2P — general introduction")}`} className="fin-btn fin-btn-primary mt-9">Introduce yourself <Arrow /></a>
            <p className="mt-6 text-[10px] leading-5 text-slate-400">INRP2P never charges candidates, requests deposits, or asks for identity and banking evidence over email.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
