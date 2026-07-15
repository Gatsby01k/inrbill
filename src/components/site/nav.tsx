import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { getSession, roleHome } from "@/lib/auth";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <BrandLockup compact={compact} />;
}

export async function SiteNav() {
  const session = await getSession();
  return (
    <header className="fin-nav">
      <div className="fin-nav-inner">
        <div className="fin-nav-brand"><Logo /><span>Private network</span></div>
        <nav className="fin-nav-links" aria-label="Primary navigation">
          <Link href="/#product">Product</Link>
          <Link href="/#operating-model">Operating model</Link>
          <Link href="/#controls">Controls</Link>
          <Link href="/how-it-works">How it works</Link>
        </nav>
        <div className="fin-nav-actions">
          {session ? (
            <Link href={roleHome(session.user.role)} className="fin-nav-login">
              Open workspace
            </Link>
          ) : (
            <Link href="/login" className="fin-nav-login">Log in</Link>
          )}
          <Link href="/request" className="fin-nav-cta">Request access</Link>
        </div>
      </div>
    </header>
  );
}
