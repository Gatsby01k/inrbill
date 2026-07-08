import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Prohibited use policy",
  description: "Activities and conduct that are not permitted on the INRP2P network.",
  alternates: { canonical: "/prohibited-use" },
};

const PROHIBITED = [
  "Submitting requests or applications involving illegally sourced, sanctioned, or unlawfully obtained funds.",
  "Engaging with, or attempting to route funds to or from, sanctioned individuals, entities or jurisdictions.",
  "Fraud, misrepresentation of identity, capacity, licensing, or the nature of a request or application.",
  "Operating in a jurisdiction, or offering a service, that requires a license or registration you do not hold.",
  "Attempting to bypass manual review — including submitting false, incomplete, or duplicate applications to force a different outcome.",
  "Contacting counterparties introduced through the network for unrelated solicitation, spam, or harassment.",
  "Scraping, automated querying, or any attempt to extract network data outside the product's intended use.",
  "Circumventing the network to move a company's or partner's data or contacts into unrelated commercial use.",
  "Facilitating money laundering, terrorist financing, or knowingly enabling a counterparty to do so.",
];

const CONSEQUENCES = [
  "Rejection of a request or application at review, without further explanation where appropriate.",
  "Suspension or termination of an existing account or workspace.",
  "Removal of a partner's verified status and exclusion from future matching.",
  "Reporting to relevant authorities where INRP2P is legally required or reasonably believes it is warranted.",
];

export default function ProhibitedUsePage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Prohibited use policy"
      sub="Conduct and activity that is not permitted anywhere on the INRP2P network."
      updated="8 July 2026"
    >
      <p>
        INRP2P exists to connect legitimate companies with reviewed liquidity partners. To
        protect the network and everyone using it, the following is not permitted — on the
        public site, in workspaces, or in any communication conducted through an introduction
        made by INRP2P.
      </p>

      <h2>Prohibited activities</h2>
      <ul>
        {PROHIBITED.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h2>Consequences</h2>
      <ul>
        {CONSEQUENCES.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p>
        INRP2P decides at its discretion whether conduct falls within this policy, and may act
        without prior notice where it reasonably believes the network or a counterparty is at
        risk.
      </p>

      <h2>Reporting a concern</h2>
      <p>
        If you believe a company, partner, or introduction is being misused in a way this policy
        covers, tell us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We review
        every report.
      </p>

      <p>
        This policy sits alongside the <Link href="/terms">Terms of Service</Link> and the{" "}
        <Link href="/disclaimer">Disclaimer</Link>, and does not limit INRP2P's rights under
        either.
      </p>
    </LegalShell>
  );
}
