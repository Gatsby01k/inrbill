import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/site/legal-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = {
  title: "Fees",
  description:
    "How INRP2P displays transaction fees and separate private-network service fees.",
  alternates: { canonical: "/fees" },
};

export default function FeesPage() {
  return (
    <LegalShell
      eyebrow="Commercial terms"
      title="Fees are shown before you move."
      sub="Every transaction quote separates the execution rate, INRP2P fee, final amount and expiry."
      updated="23 July 2026"
    >
      <p>
        A customer transaction is not created until the final terms have been shown and
        confirmed. The server quote states the amount sent, amount received, execution rate,
        INRP2P fee and fee currency. There is no hidden customer spread or later substitution of
        an expired quote.
      </p>

      <h2>Transaction fee</h2>
      <p>
        The transaction fee is calculated by the server and displayed as part of the quote.
        Exact-send and exact-receive quotes both include the fee in their final calculation.
        Pricing is unavailable when an executable rate and fee configuration are not available;
        INRP2P does not replace them with an estimated or fabricated rate.
      </p>

      <h2>External rail costs</h2>
      <p>
        The displayed receive amount includes costs controlled by the selected INRP2P
        transaction path. A customer sending USDT may also be charged a network or withdrawal
        fee by their own wallet or exchange. That third-party fee is outside INRP2P&apos;s
        control and must be shown by that provider before the customer sends. INRP2P never asks
        for a wallet secret to pay it.
      </p>

      <h2>Expired or changed terms</h2>
      <p>
        When a quote expires, or a destination, network, payment method or Receive Profile
        fallback changes, INRP2P issues fresh terms. The customer must accept the updated final
        amount, fee and timing before a new order can be created.
      </p>

      <h2>Separate private-network services</h2>
      <p>
        Review, partner access, qualified-introduction or retainer fees may apply to the
        separate company and partner network only when agreed in writing. Those fees are not
        silently added to a customer transaction quote. A separately agreed partner
        operating-reserve deposit is not a service fee or customer transaction fund; its terms
        are governed by the applicable written agreement and the{" "}
        <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Questions</h2>
      <p>
        For a fee or receipt question, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and include the order reference,
        not bank credentials or wallet secrets. See also the{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}
