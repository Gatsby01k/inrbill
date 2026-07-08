import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "Partner review framework",
  description:
    "What INRP2P assesses before a liquidity partner is verified, and what verification does and does not mean.",
  alternates: { canonical: "/partner-review" },
};

const CRITERIA = [
  { title: "Entity & KYB", text: "Registered business entity, ownership clarity, and KYB documentation available on request." },
  { title: "Directions & capacity", text: "Declared corridors (INR↔USDT, INR payouts) with realistic daily and monthly capacity bands." },
  { title: "Banking coverage", text: "Named banks and rails — IMPS, NEFT, RTGS, UPI, bulk transfer — that hold up under real volume." },
  { title: "Speed & availability", text: "Working hours and settlement speed that match what companies actually need." },
  { title: "Reserve depth", text: "Declared reserve bands, so introductions reflect liquidity that plausibly exists." },
  { title: "Compliance posture", text: "AML/KYC policy, source-of-funds documentation, and trade references where available." },
];

const STAGES = [
  { s: "Applied", d: "Application received and queued for review. No introductions happen at this stage." },
  { s: "Under review", d: "An operator is verifying the criteria above, and may request documents or a call." },
  { s: "Verified", d: "Cleared the review bar. Eligible for matching against fitting company requests." },
  { s: "Limited", d: "Verified with specific caveats noted by operations — matches may carry conditions." },
  { s: "Rejected / Suspended", d: "Did not meet the bar, or was removed from active matching after verification." },
];

export default function PartnerReviewPage() {
  return (
    <LegalShell
      eyebrow="Trust & review"
      title="Partner review framework"
      sub="What we look at before a liquidity partner is eligible to receive an introduction — and what that review does not promise."
      updated="8 July 2026"
    >
      <p>
        The network is only as good as the partners in it. Every application goes through the
        same manual review before it is eligible for matching. This page sets out exactly what
        we assess, how status moves, and — importantly — what verification does not mean.
      </p>

      <h2>What we assess</h2>
      <div className="not-prose mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.title} className="flex gap-3">
            <span className="mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10 text-[10px] text-emerald-300">
              ✓
            </span>
            <div>
              <p className="text-[13px] font-semibold text-slate-50">{c.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Review stages</h2>
      <ul className="!mt-4 space-y-3">
        {STAGES.map((x) => (
          <li key={x.s} className="!flex-col !gap-0.5 before:hidden">
            <p className="text-[13px] font-semibold text-slate-50">{x.s}</p>
            <p className="text-[13px] leading-relaxed text-slate-400">{x.d}</p>
          </li>
        ))}
      </ul>
      <p>
        Verified partners are subject to ongoing monitoring — capacity, coverage and compliance
        changes are reviewed, and status can move at any time, including back to &quot;Under review&quot;
        or to &quot;Suspended&quot;.
      </p>

      <h2>What verification does not mean</h2>
      <ul>
        <li>It is not a certification, license, or regulatory endorsement of the partner.</li>
        <li>It is not a guarantee of the partner&apos;s solvency, capacity at any given moment, or conduct.</li>
        <li>It does not make INRP2P a guarantor, agent or counterparty to any transaction the partner enters into.</li>
        <li>It does not replace a company&apos;s own due diligence before transacting.</li>
      </ul>
      <p>
        Full detail on these limits is in the <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Apply</h2>
      <p>
        Operators who support INR payout or liquidity flows can{" "}
        <Link href="/apply">apply to join the network</Link>. Expect a first response within
        24–48 hours.
      </p>
    </LegalShell>
  );
}
