import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/site/nav";
import { cn } from "@/lib/format";
import { NavLinks, type NavItem } from "./nav-links";

export function WorkspaceShell({
  badge,
  badgeTone = "gold",
  nav,
  userLine,
  children,
}: {
  badge: string;
  badgeTone?: "gold" | "emerald" | "sky";
  nav: NavItem[];
  userLine: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-white/10 bg-night-950/85 backdrop-blur-md lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5">
          <Logo />
          <span
            className={cn(
              "chip",
              badgeTone === "gold" && "border-gold-500/40 bg-gold-500/10 text-gold-300",
              badgeTone === "emerald" && "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
              badgeTone === "sky" && "border-sky-400/40 bg-sky-400/10 text-sky-300",
            )}
          >
            {badge}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          <NavLinks items={nav} />
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:mt-auto lg:block">
          <p className="truncate text-xs text-slate-500" title={userLine}>
            {userLine}
          </p>
          <form action={logout} className="mt-2.5">
            <button type="submit" className="btn btn-ghost btn-sm w-full">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-12 items-center justify-end gap-3 border-b border-white/5 px-4 sm:px-6 lg:hidden">
          <p className="truncate text-xs text-slate-500">{userLine}</p>
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Log out
            </button>
          </form>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
