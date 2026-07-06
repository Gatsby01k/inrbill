import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/lib/options";
import { Logo } from "./nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-night-950/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              A private INR liquidity network. Manual review, matching and
              qualified introductions between companies and reviewed liquidity
              partners.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div>
              <p className="eyebrow mb-3">Network</p>
              <div className="flex flex-col gap-2 text-slate-400">
                <Link href="/request" className="transition hover:text-white">Request a partner</Link>
                <Link href="/apply" className="transition hover:text-white">Apply as partner</Link>
                <Link href="/login" className="transition hover:text-white">Log in</Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-3">Contact</p>
              <div className="flex flex-col gap-2 text-slate-400">
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-white">
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-white"
                >
                  @{CONTACT_TELEGRAM}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-white/5 pt-6">
          <p className="text-xs leading-relaxed text-slate-600">
            INRP2P does not hold, transmit, convert, exchange or custody funds and is
            not a party to any transaction. INRP2P is not an exchange, OTC desk,
            wallet or payment gateway. INRP2P provides review, matching and
            introduction services only. Counterparties transact directly, under their
            own agreements and their own regulatory and compliance obligations.
          </p>
          <p className="mt-3 text-xs text-slate-700">© 2026 INRP2P. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
