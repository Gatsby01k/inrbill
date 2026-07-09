import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Fees",
  description: "How INRP2P is compensated for review, matching and introduction — and what it never charges for.",
  alternates: { canonical: "/fees" },
};

const FEE_TYPES = [
  { t: "Review fee", d: "A one-time fee that may apply to expedited or higher-complexity review, agreed before any work begins." },
  { t: "Partner access fee", d: "A fee for partners to maintain active, matchable status on the network." },
  { t: "Introduction fee", d: "A fee tied to a specific qualified introduction being made." },
  { t: "Success fee", d: "A fee contingent on an introduced relationship converting into an ongoing commercial arrangement." },
  { t: "Monthly retainer", d: "An ongoing fee for continuous sourcing, review and matching support, agreed with select companies or partners." },
];

export default function FeesPage() {
  return (
    <LegalShell
      eyebrow="Commercial terms"
      title="Fees"
      sub="How INRP2P is compensated for review, matching and introduction — nothing else."
      updated="9 July 2026"
    >
      <p>
        INRP2P charges for the coordination work it does — review, matching and introduction —
        not for the underlying transaction between introduced parties. There is no public price
        list because fees are commercial and agreed per engagement; this page explains the
        structure so there are no surprises.
      </p>

      <h2>How we&apos;re compensated</h2>
      <ul>
        {FEE_TYPES.map((f) => (
          <li key={f.t}>
            <strong>{f.t}.</strong> {f.d}
          </li>
        ))}
      </ul>

      <h2>Who pays, and when</h2>
      <p>
        Depending on the engagement, fees may be payable by the company, the partner, or split
        between both — this is agreed in writing before it applies to you. No fee is charged
        simply for submitting a request or a partner application; review and a first response
        are free.
      </p>

      <h2>What we do not charge for</h2>
      <ul>
        <li>INRP2P does not take a spread, markup or share of transaction volume.</li>
        <li>INRP2P does not charge on funds that pass between introduced parties — no funds pass through INRP2P at all.</li>
        <li>Fees are never a condition attached to the pricing or terms two introduced parties agree between themselves.</li>
      </ul>

      <h2>Billing today</h2>
      <p>
        Revenue is tracked internally by network operations through a clear lifecycle
        (potential, quoted, agreed, invoiced, paid). For INRP2P&apos;s own coordination fees
        listed above, we may send a secure payment link — processed by a licensed third-party
        payment gateway — or invoice you directly for bank transfer, whichever is more
        convenient. This applies only to INRP2P&apos;s own fees. INRP2P never processes, holds
        or routes the funds exchanged between introduced parties themselves — that settlement
        always happens directly between you and the other party, entirely outside the platform.
      </p>

      <h2>Changes to fees</h2>
      <p>
        Any change to fees that apply to you will be agreed with you directly before it takes
        effect — nothing here overrides a specific written agreement you have with INRP2P.
      </p>

      <h2>Questions</h2>
      <p>
        For fee questions specific to your request or application, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}
