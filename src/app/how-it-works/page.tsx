import type { Metadata } from "next";
import Link from "next/link";
import { CorePositions, LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How an INR ↔ USDT move progresses from an expiring server quote through verified payment, settlement, reconciliation and receipt.",
  alternates: { canonical: "/how-it-works" },
};

const STAGES = [
  {
    t: "1. See the final result",
    d: "Choose INR or USDT, enter what you will send or must receive, and see the server-calculated rate, fee, final amount, estimated time and quote expiry before signing in.",
  },
  {
    t: "2. Add only what this move needs",
    d: "Authenticate, complete the required compliance checks, then select a saved payment source and destination. Bank details are saved methods, not described as connected accounts unless a real provider confirms that connection.",
  },
  {
    t: "3. Confirm the exact terms",
    d: "Review the source, masked destination, network, rate, fee, final amount and expiry. Holding the confirmation control triggers fresh server checks for the quote, limits, compliance and available capacity.",
  },
  {
    t: "4. Pay using issued instructions",
    d: "Use the exact UPI, bank-transfer or blockchain instructions attached to the order. Submitting a UTR or transaction ID is only a payment signal; it does not prove that funds arrived.",
  },
  {
    t: "5. Track and receive",
    d: "The same workspace reports detected and confirmed payment, settlement progress, network confirmations and completion. A final receipt records the references and timestamps that are actually available.",
  },
];

const ROLES = [
  {
    who: "Customer",
    does: "Provides accurate identity and payment details, checks the final terms, and pays only the active order instructions.",
    not: "Never shares a bank password, wallet private key or seed phrase.",
  },
  {
    who: "INRP2P operations",
    does: "Enforces state transitions, reviews payment evidence, controls assignment and settlement release, and preserves an audit trail.",
    not: "Never treats a screenshot, customer button or unverified reference as settled funds.",
  },
  {
    who: "Reviewed party or provider",
    does: "Supplies eligible capacity and performs the bank or blockchain transfer under the applicable operating agreement.",
    not: "Is not selected by the customer or exposed through a public order book.",
  },
];

export default function HowItWorksPage() {
  return (
    <LegalShell
      eyebrow="How it works"
      title="One move. The controls stay behind it."
      sub="The customer sees a quote, the required details, one confirmation and a live result. Operations retains the stricter workflow."
      updated="23 July 2026"
    >
      <p>
        INRP2P is a controlled transaction workflow, not a public exchange or chat-based
        marketplace. A customer does not choose a trader or negotiate from an order book.
        Routing, capacity reservation, evidence, settlement controls and reconciliation remain
        inside the operations system.
      </p>

      <h2>The customer flow</h2>
      <ul className="!mt-4 space-y-5">
        {STAGES.map((stage) => (
          <li key={stage.t} className="!flex-col !gap-1 before:hidden">
            <p className="text-[13.5px] font-semibold text-slate-900">{stage.t}</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{stage.d}</p>
          </li>
        ))}
      </ul>

      <h2>What happens when a quote expires</h2>
      <p>
        An expired rate is never reused. INRP2P requests a fresh quote and rechecks the selected
        methods, customer limits, compliance state and capacity. If a Receive Profile fallback
        would change the amount, fee or timing, the customer must see and accept the updated
        terms first.
      </p>

      <h2>How payment and settlement are confirmed</h2>
      <p>
        Payment moves through explicit server-enforced states. Automatic confirmation is used
        only when a configured bank, payment or blockchain provider supplies a valid signed
        event. Otherwise, an authorised operator must independently verify the real transfer.
        Settlement release is separately permissioned, idempotent and blocked when prior
        attempts, references, evidence or uncertain payment create a double-payment risk.
      </p>

      <h2>Roles and responsibilities</h2>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role.who} className="rounded-lg border border-black/[0.08] bg-black/[0.015] p-4">
            <p className="text-[12.5px] font-semibold text-slate-900">{role.who}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{role.does}</p>
            <p className="mt-2 text-xs leading-relaxed text-rose-600">{role.not}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <CorePositions />
      </div>

      <h2>Start with the amount</h2>
      <p>
        Open <Link href="/">Move</Link> to request a quote. For operating and regulatory
        boundaries, read the <Link href="/disclaimer">Disclaimer</Link> before sending funds.
      </p>
    </LegalShell>
  );
}
