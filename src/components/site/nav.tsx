import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { getSession, roleHome } from "@/lib/auth";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <BrandLockup compact={compact} />;
}

export async function SiteNav() {
  const session = await getSession();
  const customer = session?.user.role === "CUSTOMER";
  const customerGate = customer ? "" : "/auth/customer";
  const accountHref = session
    ? roleHome(session.user.role)
    : "/auth/customer";
  const items = [
    { href: "/", label: "Move" },
    { href: customer ? "/orders" : customerGate, label: "Orders" },
    { href: customer ? "/receive" : customerGate, label: "Receive" },
    { href: accountHref, label: "Account" },
  ];
  return (
    <header className="fin-nav">
      <div className="fin-nav-inner">
        <div className="fin-nav-brand"><Logo /><span>INR ↔ USDT</span></div>
        <nav className="fin-nav-links" aria-label="Primary navigation">
          {items.map((item) => (
            <Link href={item.href} key={item.label}>{item.label}</Link>
          ))}
        </nav>
        <div className="fin-nav-actions">
          <Link href="/" className="fin-nav-cta">Move</Link>
        </div>
      </div>
    </header>
  );
}
