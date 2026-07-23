import type { Metadata } from "next";
import { CorePositions, LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "INRP2P's product disclaimer: controlled external payment and settlement operations with no guarantee of liquidity, pricing, regulatory status, or completion.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Disclaimer"
      sub="A plain statement of what INRP2P is, what it is not, and where responsibility sits."
      updated="23 July 2026"
    >
      <p>
        This disclaimer applies to every page, form and workspace on INRP2P. It exists so
        that companies, partners and anyone evaluating the network understand exactly what
        the service does — and, just as importantly, what it deliberately does not do.
      </p>

      <CorePositions />

      <h2>Nature of the service</h2>
      <p>
        INRP2P provides a customer transaction interface and a separate operations layer for
        executable quotes, payment instructions, reviewed liquidity capacity, payment matching,
        settlement release, evidence, reconciliation and audit. It also retains private
        partner-network and introduction workflows. The software does not itself establish that
        INRP2P or any participating party holds a licence or registration. Live availability must
        be limited to the operating model, providers and jurisdictions approved by qualified
        counsel and the responsible regulated parties.
      </p>

      <h2>Payment, custody and settlement boundary</h2>
      <p>
        INRP2P does not request bank passwords, wallet private keys or seed phrases and does not
        provide a pooled public order book. A confirmed customer order may instruct payment to
        the assigned reviewed party and may release settlement through a configured external
        provider or a controlled operator process. Those external parties perform the actual
        bank or blockchain transfer. The application records instructions, references,
        confirmations and audit events; it does not treat a screenshot or customer button as
        proof that funds settled.
      </p>

      <h2>Partner operating-reserve deposits</h2>
      <p>
        Where separately agreed with an eligible partner, INRP2P may request an operating-reserve
        deposit to the official company USDT-TRC20 address displayed inside the authenticated
        partner workspace. The partner reports the transaction hash and an operator verifies the
        token, destination, amount and on-chain status before crediting the internal reserve ledger.
        That reserve is separate from customer money and from the funds used in any introduced
        transaction. It is not escrow, an investment product, a guarantee of income, a guarantee
        of volume or consideration for a particular trade. The amount, purpose, duration, return
        conditions and any lawful deductions must be set out in the applicable partner agreement.
        The company wallet address may change; a partner must use only the address attached to the
        specific deposit instruction and never an address supplied in chat.
      </p>

      <h2>No guarantee of liquidity or completion</h2>
      <p>
        Capacity is declared by reviewed parties and reserved transactionally inside the
        application, but a database reservation is not a guarantee that a bank, blockchain,
        provider or counterparty will perform. Quotes expire and availability is rechecked before
        confirmation. INRP2P does not guarantee a rate, capacity, time to completion or successful
        outcome. Market conditions, banking restrictions, compliance holds and provider failures
        may delay, review, cancel or fail a transaction.
      </p>

      <h2>No guarantee of introduction</h2>
      <p>
        Submitting a request or a partner application starts a manual review — it does not
        entitle the submitter to a match or an introduction. INRP2P may decline, pause or end
        review of any request or application at its discretion, including where information is
        incomplete, unverifiable, inconsistent, or where the counterparty risk profile is not a
        fit for the network.
      </p>

      <h2>Not financial, legal or tax advice</h2>
      <p>
        Nothing on INRP2P — including copy on this site, communications from network operations,
        or the fact that a partner has been verified — constitutes financial, investment, legal,
        tax or regulatory advice. Companies and partners should obtain independent professional
        advice appropriate to their own circumstances and jurisdiction before entering into any
        transaction.
      </p>

      <h2>Counterparty responsibility</h2>
      <p>
        Each party introduced through the network is solely responsible for its own licensing,
        registration, KYC/KYB, anti-money-laundering controls, tax treatment, sanctions
        screening and any other legal or regulatory obligation that applies to it in every
        jurisdiction in which it operates. INRP2P&apos;s review process is a network-quality filter,
        not a substitute for either party&apos;s own due diligence, and verification of a partner is
        not a certification, endorsement or warranty by INRP2P of that partner&apos;s compliance,
        solvency or conduct.
      </p>

      <h2>No agency, no partnership</h2>
      <p>
        INRP2P acts as an independent intermediary. Nothing in these terms creates an agency,
        partnership, joint venture, fiduciary or employment relationship between INRP2P and any
        company, partner or user, nor does INRP2P act as agent for either side of an introduced
        transaction.
      </p>

      <h2>Assumption of risk</h2>
      <p>
        Cross-border INR liquidity arrangements, and any activity involving digital assets,
        carry inherent commercial, counterparty, regulatory and market risk. Companies and
        partners engage with introduced counterparties at their own risk and are encouraged to
        conduct their own diligence — including direct verification of identity, licensing and
        banking capability — before agreeing terms or moving funds.
      </p>

      <h2>Jurisdictional variability</h2>
      <p>
        Regulatory treatment of INR liquidity, payout and digital-asset activity differs by
        jurisdiction and changes over time. Availability of the network, or of specific
        corridors, may be limited or unavailable in certain jurisdictions. Nothing here is a
        representation that any particular use of the network is lawful in any specific
        jurisdiction — that assessment is the responsibility of each party.
      </p>

      <h2>Questions</h2>
      <p>
        If any part of this disclaimer is unclear, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> before submitting a request or
        application.
      </p>
    </LegalShell>
  );
}
