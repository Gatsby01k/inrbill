import type { Metadata } from "next";
import Link from "next/link";
import { CorePositions, LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The full INRP2P process: intake, manual review, requirements-based matching, and qualified introduction. No custody or execution of the underlying transaction.",
  alternates: { canonical: "/how-it-works" },
};

const STAGES = [
  {
    t: "1. Intake",
    d: "A company submits a liquidity request, or an operator submits a partner application. Each captures direction, volume, rails, urgency, jurisdiction and compliance posture in one structured form — no back-and-forth over chat.",
  },
  {
    t: "2. Manual review",
    d: "A person on network operations reviews every submission. We check completeness, plausibility, and basic KYB/compliance signals. Requests or applications that don't meet network standards are declined at this stage, not later.",
  },
  {
    t: "3. Matching",
    d: "Reviewed requests are compared against verified partners on direction, volume band, banking coverage, required speed and jurisdiction. This is a shortlist built by an operator, not an automated auction or public order book.",
  },
  {
    t: "4. Qualified introduction",
    d: "When both sides look like a fit, we make the introduction — by email or Telegram — and release each party's summary to the other inside their workspace. From this point, the company and the partner deal directly.",
  },
  {
    t: "5. Direct settlement",
    d: "Terms, pricing, rails and settlement are agreed and executed entirely between the introduced parties, under their own agreement. INRP2P is not involved in, and does not process, any part of the transaction itself.",
  },
];

const ROLES = [
  {
    who: "INRP2P",
    does: "Reviews submissions, matches on declared requirements, makes introductions, tracks the pipeline and audit trail.",
    not: "Does not hold funds, execute payments, set pricing, or guarantee outcomes.",
  },
  {
    who: "Company",
    does: "Provides accurate requirements, completes its own KYC/KYB, negotiates and settles directly with the introduced partner.",
    not: "Is not entitled to a guaranteed match, partner, or transaction outcome.",
  },
  {
    who: "Partner",
    does: "Declares real capacity and coverage, keeps it current, and honours terms agreed directly with introduced companies.",
    not: "Is not endorsed, guaranteed or indemnified by INRP2P for its conduct.",
  },
];

export default function HowItWorksPage() {
  return (
    <LegalShell
      eyebrow="How it works"
      title="Review, matching, introduction — nothing else."
      sub="A closer look at what happens between submitting a request and being introduced to a partner."
      updated="8 July 2026"
    >
      <p>
        INRP2P exists to replace random Telegram groups and cold-broker outreach with a
        reviewed process. The mechanics are deliberately simple: intake, review, matching,
        introduction. Everything after an introduction happens directly between the company
        and the partner.
      </p>

      <h2>The five stages</h2>
      <ul className="!mt-4 space-y-5">
        {STAGES.map((s) => (
          <li key={s.t} className="!flex-col !gap-1 before:hidden">
            <p className="text-[13.5px] font-semibold text-slate-900">{s.t}</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{s.d}</p>
          </li>
        ))}
      </ul>

      <h2>What &quot;manual review&quot; means in practice</h2>
      <p>
        Every request and every partner application is read and assessed by a person on network
        operations — never approved automatically, and never accepted purely on payment of a
        fee. Review checks completeness of the submission, plausibility of the stated volume and
        capacity, and available compliance signals (entity registration, KYB documentation,
        references). Requests or applications that don&apos;t clear this bar are declined or sent back
        for more information.
      </p>

      <h2>What a &quot;qualified introduction&quot; is — and isn&apos;t</h2>
      <p>
        A qualified introduction means an operator has reviewed both sides, judged them a
        reasonable fit on stated requirements, and connected them directly. It is a considered
        starting point for a commercial conversation. It is <strong>not</strong> a guarantee of
        available liquidity, agreed pricing, or a completed transaction — those depend entirely
        on the two parties reaching their own agreement.
      </p>

      <h2>Typical timelines</h2>
      <p>
        Most requests receive a first response from operations within 24–48 hours. If the
        network has a suitable verified partner, shortlisting and introduction typically follow
        within a few business days. Complex or higher-volume requests, or those needing
        additional KYB, can take longer — operations will tell you where things stand rather
        than leave you guessing.
      </p>

      <h2>Roles and responsibilities</h2>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.who} className="rounded-lg border border-black/[0.08] bg-black/[0.015] p-4">
            <p className="text-[12.5px] font-semibold text-slate-900">{r.who}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{r.does}</p>
            <p className="mt-2 text-xs leading-relaxed text-rose-600">{r.not}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <CorePositions />
      </div>

      <h2>Ready to start?</h2>
      <p>
        <Link href="/request">Submit a company request</Link> or{" "}
        <Link href="/apply">apply as a liquidity partner</Link>. Review criteria for partners are
        detailed on the <Link href="/partner-review">Partner review</Link> page.
      </p>
    </LegalShell>
  );
}
