import Link from "next/link";
import { getSession, roleHome } from "@/lib/auth";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/40 bg-gradient-to-b from-gold-500/20 to-gold-600/5 font-display text-sm font-bold text-gold-300">
        ₹
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-wide text-slate-100">
          INR<span className="text-gold-400">P2P</span>
        </span>
      )}
    </Link>
  );
}

export async function SiteNav() {
  const session = await getSession();
  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-400 md:flex">
          <Link href="/#how-it-works" className="transition hover:text-white">How it works</Link>
          <Link href="/#standards" className="transition hover:text-white">Network standards</Link>
          <Link href="/#no-custody" className="transition hover:text-white">No custody</Link>
          <Link href="/#contact" className="transition hover:text-white">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href={roleHome(session.user.role)} className="btn btn-ghost btn-sm">
              Open workspace
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
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
