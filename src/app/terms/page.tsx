import type { Metadata } from "next";
import Link from "next/link";
import { CorePositions, LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of the INRP2P review, matching and introduction network.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      sub="The agreement between you and INRP2P when you submit a request, apply as a partner, or otherwise use the network."
      updated="8 July 2026"
    >
      <p>
        These terms govern access to and use of INRP2P (the "network", "service"). By
        submitting a company request, a partner application, or otherwise using any part of
        the site or workspaces, you agree to these terms on behalf of yourself and the entity
        you represent. If you do not agree, do not use the service.
      </p>

      <h2>1. What the service is</h2>
      <p>
        INRP2P provides intake, manual review, requirements-based matching and qualified
        introductions between companies seeking INR liquidity (INR ↔ USDT, INR payouts) and
        independent liquidity partners. See <Link href="/how-it-works">How it works</Link> for
        the full process.
      </p>

      <CorePositions />

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 and authorised to bind the company or entity you represent.</li>
        <li>Information you submit must be accurate, current and not misleading.</li>
        <li>
          You must be able to satisfy standard KYC/KYB requirements if requested during review or
          by an introduced counterparty.
        </li>
        <li>
          Use of the network is subject to our{" "}
          <Link href="/prohibited-use">Prohibited Use Policy</Link>.
        </li>
      </ul>

      <h2>3. Review and introductions are not guaranteed</h2>
      <p>
        Every request and application is subject to manual review. INRP2P may accept, decline,
        pause, request more information about, or discontinue review of any submission at its
        discretion. Reaching "Verified" partner status or "In Review" request status is not a
        promise of a match; a match is not a promise of an introduction; an introduction is not
        a promise of a completed transaction.
      </p>

      <h2>4. Counterparty responsibility</h2>
      <p>
        Once introduced, companies and partners deal with each other directly. INRP2P is not a
        party to, and has no liability arising from, any agreement, transaction, payment or
        dispute between introduced counterparties. Each party is solely responsible for its own
        licensing, KYC/KYB, AML, tax and other legal obligations — see the{" "}
        <Link href="/disclaimer">Disclaimer</Link> for the full position.
      </p>

      <h2>5. Fees</h2>
      <p>
        INRP2P may charge review, partner access, introduction, success or retainer fees as
        described on the <Link href="/fees">Fees</Link> page and as agreed in writing for your
        specific engagement. Fees relate to the review, matching and introduction service only,
        never to a share of settlement volume, and are never a condition INRP2P imposes on the
        underlying transaction between counterparties.
      </p>

      <h2>6. Your account and workspace</h2>
      <p>
        Submitting a request or application creates a workspace account. You are responsible
        for keeping your login credentials confidential and for activity under your account.
        Notify us immediately at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you
        suspect unauthorised access.
      </p>

      <h2>7. Confidentiality</h2>
      <p>
        Request and partner details are visible to network operations and are only shared with
        a specific counterparty once an introduction is explicitly released. You agree not to
        misuse, publish or redistribute counterparty information received through an
        introduction beyond what is reasonably necessary to evaluate and conduct that
        relationship.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The INRP2P name, mark, site design and underlying software are owned by INRP2P or its
        licensors. Nothing in these terms grants you rights in that material beyond ordinary use
        of the service.
      </p>

      <h2>9. Disclaimers of warranties</h2>
      <p>
        The service is provided "as is" and "as available". To the fullest extent permitted by
        law, INRP2P disclaims all warranties, express or implied, including fitness for a
        particular purpose, accuracy of partner or company representations, and uninterrupted
        or error-free operation.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, INRP2P's aggregate liability arising from or
        relating to the service or these terms is limited to the fees you have paid INRP2P in
        the twelve months preceding the claim, and INRP2P is not liable for indirect,
        consequential, special or punitive damages, or for any loss arising from a transaction
        or dispute between introduced counterparties.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold INRP2P harmless from claims arising from your breach of
        these terms, your submissions to the network, or your conduct with an introduced
        counterparty.
      </p>

      <h2>12. Term, suspension and termination</h2>
      <p>
        INRP2P may suspend or terminate access at any time, with or without notice, where
        conduct breaches these terms, the <Link href="/prohibited-use">Prohibited Use Policy</Link>,
        or otherwise poses a risk to the network. You may stop using the service at any time.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        The governing law and dispute-resolution forum for these terms will be specified prior
        to general availability and confirmed with counsel; until then this section is a
        placeholder and not a binding choice of law.
      </p>

      <h2>14. Changes to these terms</h2>
      <p>
        We may update these terms as the service evolves. Material changes will be reflected by
        an updated "last updated" date on this page; continued use after a change constitutes
        acceptance.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
