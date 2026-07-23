import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";
import { CONTACT_EMAIL, CONTACT_LINKEDIN, CONTACT_TELEGRAM, CONTACT_TELEGRAM_CHANNEL } from "@/lib/options";

const network = [["/", "Move"], ["/orders", "Orders"], ["/receive", "Receive"], ["/account", "Account"], ["/how-it-works", "How it works"]];
const legal = [["/partner-review", "Partner review"], ["/fees", "Fees"], ["/disclaimer", "Disclaimer"], ["/prohibited-use", "Prohibited use"], ["/privacy", "Privacy"], ["/terms", "Terms"]];

export function SiteFooter() {
  return (
    <footer className="fin-footer">
      <div className="fin-footer-inner">
        <div className="fin-footer-lead">
          <Link href="/" className="fin-footer-brand"><BrandMark size={38} /><Wordmark className="!text-[20px] text-white" /></Link>
          <h2>Move INR and USDT with the final result visible first.</h2>
          <p>Verified methods, controlled routing, independent payment confirmation and a complete audit trail.</p>
        </div>
        <div className="fin-footer-grid">
          <div><p className="fin-footer-label">Network</p><div className="fin-footer-links">{network.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</div></div>
          <div><p className="fin-footer-label">Trust &amp; legal</p><div className="fin-footer-links">{legal.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</div></div>
          <div><p className="fin-footer-label">Direct contact</p><div className="fin-footer-links">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={`https://t.me/${CONTACT_TELEGRAM}`} target="_blank" rel="noreferrer">CEO on Telegram</a>
            <a href={`https://t.me/${CONTACT_TELEGRAM_CHANNEL}`} target="_blank" rel="noreferrer">Network channel</a>
            <a href={CONTACT_LINKEDIN} target="_blank" rel="noreferrer">LinkedIn</a>
          </div></div>
        </div>
        <div className="fin-footer-bottom">
          <p>INRP2P is not a public exchange or order book. Customer orders use reviewed capacity and controlled external payment and settlement rails; a customer payment signal alone never confirms funds. INRP2P never requests bank passwords, private keys, or seed phrases and does not guarantee liquidity, pricing, regulatory status, or completion. Applicable licensing, KYC/AML, tax, and legal requirements must be established for the live operating model.</p>
          <div><span>© 2026 INRP2P</span><span>Private by design</span><span>India · Global counterparties</span></div>
        </div>
      </div>
    </footer>
  );
}
