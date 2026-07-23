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
      <main className="fin-legal-page flex-1">
        <div className="fin-legal-container">
          <p className="fin-kicker"><span /> {eyebrow}</p>
          <h1>{title}</h1>
          <p className="fin-legal-sub">{sub}</p>
          <p className="fin-legal-updated">Last updated {updated}</p>
          <div className="prose-legal fin-legal-document">{children}</div>
          <div className="fin-legal-links">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const CORE_POSITIONS = [
  "INRP2P does not operate a public exchange, order book, OTC chat desk or trader-selection marketplace.",
  "A customer order is created only from a server quote, approved compliance state, validated methods and transactionally reserved capacity.",
  "A customer payment signal never confirms funds; payment requires independent provider, bank, network or authorised operator verification.",
  "Settlement is performed by the assigned reviewed party or configured provider and remains subject to controlled release, evidence and reconciliation.",
  "INRP2P does not request or store bank passwords, wallet private keys or seed phrases.",
  "A partner operating-reserve deposit is separate from transaction funds and exists only where expressly agreed.",
  "No quote, capacity, rate, completion, licence or regulatory status is guaranteed or represented by the software.",
];

/** The transaction product's mandatory operating boundaries. */
export function CorePositions({ title = "What INRP2P is — and is not" }: { title?: string }) {
  return (
    <div className="not-prose rounded-xl border border-black/[0.08] bg-black/[0.02] p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {CORE_POSITIONS.map((t) => (
          <li key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-700">
            <span className="mt-[7px] h-1 w-3 shrink-0 rounded-full bg-gold-500/70" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
