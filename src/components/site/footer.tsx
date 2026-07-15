import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";
import { CONTACT_EMAIL, CONTACT_LINKEDIN, CONTACT_TELEGRAM, CONTACT_TELEGRAM_CHANNEL } from "@/lib/options";

const network = [["/request", "Request a partner"], ["/apply", "Apply as a partner"], ["/inr-p2p-index", "Liquidity index"], ["/corridors", "Corridors"], ["/how-it-works", "How it works"], ["/login", "Log in"]];
const legal = [["/partner-review", "Partner review"], ["/fees", "Fees"], ["/disclaimer", "Disclaimer"], ["/prohibited-use", "Prohibited use"], ["/privacy", "Privacy"], ["/terms", "Terms"]];

export function SiteFooter() {
  return (
    <footer className="fin-footer">
      <div className="fin-footer-inner">
        <div className="fin-footer-lead">
          <Link href="/" className="fin-footer-brand"><BrandMark size={38} /><Wordmark className="!text-[20px] text-white" /></Link>
          <h2>India&apos;s private liquidity network, built for accountable introductions.</h2>
          <p>Verification, live capacity and controlled routing. No custody. No platform execution.</p>
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
          <p>INRP2P does not hold, transmit, convert, exchange or custody funds and is not a party to any transaction. INRP2P is not an exchange, OTC desk, wallet or payment gateway, and does not guarantee liquidity or completion. INRP2P provides review, matching and introduction services only. Counterparties transact directly and remain responsible for their own licensing, KYC, AML, tax and legal obligations.</p>
          <div><span>© 2026 INRP2P</span><span>Private by design</span><span>India · Global counterparties</span></div>
        </div>
      </div>
    </footer>
  );
}
