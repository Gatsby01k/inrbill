import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { getSession, roleHome } from "@/lib/auth";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <BrandLockup compact={compact} />;
}

export async function SiteNav() {
  const session = await getSession();
  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-500 md:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-slate-900">
            How it works
          </Link>
          <Link href="/corridors" className="transition-colors hover:text-slate-900">
            Corridors
          </Link>
          <Link href="/#standards" className="transition-colors hover:text-slate-900">
            Network standards
          </Link>
          <Link href="/#no-custody" className="transition-colors hover:text-slate-900">
            No custody
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-slate-900">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href={roleHome(session.user.role)} className="btn btn-ghost btn-sm">
              Open workspace
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Log in
            </Link>
          )}
          <Link href="/request" className="btn btn-gold btn-sm">
            Request a partner
          </Link>
        </div>
      </div>
    </header>
  );
}
