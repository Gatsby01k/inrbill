import Link from "next/link";
import { SiteNav } from "./nav";
import { SiteFooter } from "./footer";

export const LEGAL_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/partner-review", label: "Partner review" },
  { href: "/fees", label: "Fees" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/prohibited-use", label: "Prohibited use" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function LegalShell({
  eyebrow,
  title,
  sub,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="hero-aurora flex-1 pb-24 pt-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-50 sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-slate-400">{sub}</p>
          <p className="mt-4 text-xs text-slate-500">Last updated {updated}</p>

          <div className="prose-legal card mt-8 p-6 sm:p-8">{children}</div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-gold-400"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const CORE_POSITIONS = [
  "INRP2P does not custody funds at any point, in any currency.",
  "INRP2P does not execute payments, payouts or settlement of any kind.",
  "INRP2P does not operate an exchange, OTC desk or trading venue.",
  "INRP2P does not guarantee liquidity, capacity or pricing from any partner.",
  "INRP2P does not guarantee that any transaction between introduced parties will complete.",
  "Every introduction is subject to manual review and is never guaranteed.",
  "Counterparties are solely responsible for their own licensing, KYC, AML, tax and legal obligations.",
];

/** The seven mandatory disclosures, rendered as a compact reference card. */
export function CorePositions({ title = "What INRP2P is — and is not" }: { title?: string }) {
  return (
    <div className="not-prose rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {CORE_POSITIONS.map((t) => (
          <li key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-300">
            <span className="mt-[7px] h-1 w-3 shrink-0 rounded-full bg-gold-500/70" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
