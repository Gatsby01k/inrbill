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
          <Link href="/#product" className="transition-colors hover:text-slate-900">
            Product
          </Link>
          <Link href="/#operating-model" className="transition-colors hover:text-slate-900">
            Operating model
          </Link>
          <Link href="/#controls" className="transition-colors hover:text-slate-900">
            Controls
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
            Set up network
          </Link>
        </div>
      </div>
    </header>
  );
}
