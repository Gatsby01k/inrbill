import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How INRP2P collects, uses, shares and protects information submitted to the network.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      sub="What we collect through requests, applications and workspaces, and how it is used."
      updated="19 July 2026"
    >
      <p>
        This policy explains how INRP2P handles information submitted by companies and
        partners through the public forms, workspaces, and any direct communication with
        network operations.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Account and contact information</h3>
      <ul>
        <li>Name, email, phone, Telegram handle, role/title.</li>
        <li>Company or entity name, website, jurisdiction of registration.</li>
        <li>Login credentials (passwords are stored as salted, hashed values — never in plain text).</li>
      </ul>
      <h3>Request and application details</h3>
      <ul>
        <li>
          Company requests: direction, expected volume, tickets, banks/rails, urgency, target
          countries, KYC/compliance posture, and free-text notes you provide.
        </li>
        <li>
          Partner applications: supported directions and rails, capacity, ticket ranges,
          settlement preferences, compliance status, references, and free-text notes.
        </li>
        <li>Restricted evidence you choose to submit for KYB, bank and risk review.</li>
      </ul>
      <h3>Usage and technical information</h3>
      <ul>
        <li>Session cookies required to keep you signed in to your workspace.</li>
        <li>Basic technical logs (timestamps, IP, user agent) used for security and abuse prevention.</li>
      </ul>
      <h3>Deposit and payment records</h3>
      <ul>
        <li>Deposit reference, public destination address, USDT amount, network and review status.</li>
        <li>Transaction hashes used for reconciliation, operator review, audit and refunds.</li>
        <li>INRP2P does not collect or store your wallet private key or seed phrase.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To review your request or application and assess fit for the network.</li>
        <li>To match requests against verified partners on declared requirements.</li>
        <li>To communicate with you about status, review questions and introductions.</li>
        <li>To maintain the audit trail that records review and status decisions.</li>
        <li>To detect abuse, fraud and violations of the <Link href="/prohibited-use">Prohibited Use Policy</Link>.</li>
        <li>To meet legal, tax and regulatory obligations that apply to INRP2P.</li>
      </ul>
      <p>We do not sell personal information, and we do not use your data to serve advertising.</p>

      <h2>3. How information is shared</h2>
      <p>
        Request and partner details are visible internally to network operations only. A
        specific company&apos;s request summary is shared with a specific partner — and vice versa —
        only once an admin explicitly releases that introduction. We may also share information:
      </p>
      <ul>
        <li>With infrastructure, email, verification and payment providers under confidentiality and data-protection obligations.</li>
        <li>Where required by law, regulation, legal process, or to protect the rights and safety of the network.</li>
        <li>In connection with a merger, acquisition or asset transfer, with continuity of this policy&apos;s protections.</li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        We retain requests, applications, verification evidence and audit records only as long
        as needed to operate the network, resolve disputes and meet legal obligations. Evidence
        retention is set by review type and jurisdiction; audit events may be retained longer.
      </p>

      <h2>5. Security</h2>
      <p>
        Passwords are hashed with bcrypt. Sessions use random, high-entropy tokens in httpOnly,
        SameSite cookies (secure in production). Restricted evidence is stored outside the
        application database in a private, KMS-encrypted object vault and is opened through
        short-lived authorized links. No system is perfectly secure.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, export or
        delete personal information we hold about you, or to object to certain processing.
        Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to make a request; we
        will respond within a reasonable time and may need to verify your identity first.
      </p>

      <h2>7. Cookies and sessions</h2>
      <p>
        We use essential session, two-factor challenge and referral-attribution cookies. We do
        not use third-party advertising or tracking cookies.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Information may be processed and stored in countries other than your own. Where this
        occurs, we take reasonable steps to ensure the same standard of protection described in
        this policy.
      </p>

      <h2>9. Children</h2>
      <p>
        The service is intended for business use by adults acting on behalf of companies or
        entities. It is not directed at children, and we do not knowingly collect information
        from anyone under 18.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy as the service evolves. Material changes will be reflected by
        an updated &quot;last updated&quot; date on this page.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
