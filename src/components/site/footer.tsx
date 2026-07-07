import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/lib/options";
import { Logo } from "./nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.07] bg-[#F5F0E6]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
              A private INR liquidity network. Manual review, matching and
              qualified introductions between companies and reviewed liquidity
              partners.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[13px]">
            <div>
              <p className="eyebrow mb-3">Network</p>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/request" className="transition-colors hover:text-slate-900">
                  Request a partner
                </Link>
                <Link href="/apply" className="transition-colors hover:text-slate-900">
                  Apply as partner
                </Link>
                <Link href="/login" className="transition-colors hover:text-slate-900">
                  Log in
                </Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-3">Contact</p>
              <div className="flex flex-col gap-2 text-slate-500">
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-slate-900">
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://t.me/${CONTACT_TELEGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-slate-900"
                >
                  @{CONTACT_TELEGRAM}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-black/[0.07] pt-6">
          <p className="text-xs leading-relaxed text-slate-500">
            INRP2P does not hold, transmit, convert, exchange or custody funds and is
            not a party to any transaction. INRP2P is not an exchange, OTC desk,
            wallet or payment gateway. INRP2P provides review, matching and
            introduction services only. Counterparties transact directly, under their
            own agreements and their own regulatory and compliance obligations.
          </p>
          <p className="mt-3 text-xs text-slate-400">© 2026 INRP2P. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
