import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";
import {
  CONTACT_EMAIL,
  CONTACT_LINKEDIN,
  CONTACT_TELEGRAM,
  CONTACT_TELEGRAM_CHANNEL,
} from "@/lib/options";

export function SiteFooter() {
  return (
    <footer className="band-ink border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={27} />
              <Wordmark className="text-slate-100" />
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
              A private INR liquidity network. Manual review, matching and
              qualified introductions between companies and reviewed liquidity
              partners.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[13px] sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                Network
              </p>
              <div className="mt-3 flex flex-col gap-2 text-slate-400">
                <Link href="/request" className="transition-colors hover:text-white">
                  Request a partner
                </Link>
                <Link href="/apply" className="transition-colors hover:text-white">
                  Apply for Trader Review
                </Link>
                <Link href="/how-it-works" className="transition-colors hover:text-white">
                  How it works
                </Link>
                <Link href="/login" className="transition-colors hover:text-white">
                  Log in
                </Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                Legal &amp; trust
              </p>
              <div className="mt-3 flex flex-col gap-2 text-slate-400">
                <Link href="/partner-review" className="transition-colors hover:text-white">
                  Partner review
                </Link>
                <Link href="/fees" className="transition-colors hover:text-white">
                  Fees
                </Link>
                <Link href="/disclaimer" className="transition-colors hover:text-white">
                  Disclaimer
                </Link>
                <Link href="/prohibited-use" className="transition-colors hover:text-white">
                  Prohibited use
                </Link>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Privacy
                </Link>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Terms
                </Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                Contact
              </p>
              <div className="mt-3 flex flex-col gap-2 text-slate-400">
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-white">
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Telegram — CEO @{CONTACT_TELEGRAM}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM_CHANNEL}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Telegram channel @{CONTACT_TELEGRAM_CHANNEL}
                </a>
                <a
                  href={CONTACT_LINKEDIN}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">
            INRP2P does not hold, transmit, convert, exchange or custody funds and is
            not a party to any transaction. INRP2P is not an exchange, OTC desk,
            wallet or payment gateway, and does not guarantee liquidity or transaction
            completion. INRP2P provides review, matching and introduction services
            only; introductions are subject to manual review and are not guaranteed.
            Counterparties transact directly, under their own agreements, and are
            solely responsible for their own licensing, KYC, AML, tax and legal
            obligations.
          </p>
          <p className="mt-3 text-xs text-slate-600">© 2026 INRP2P. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
