import { logout } from "@/app/actions/auth";
import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/format";
import { APP_VERSION } from "@/lib/site";
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
      <aside className="shrink-0 border-b border-black/[0.08] bg-[#F6F1E7] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[236px] lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-[60px] items-center justify-between border-b border-black/[0.06] px-4 lg:px-5">
          <BrandLockup markSize={26} />
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              badgeTone === "gold" && "border-gold-600/40 bg-gold-500/10 text-gold-700",
              badgeTone === "emerald" && "border-emerald-300 bg-emerald-50 text-emerald-700",
              badgeTone === "sky" && "border-sky-300 bg-sky-50 text-sky-700",
            )}
          >
            {badge}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2.5 lg:flex-col lg:overflow-visible lg:py-4">
          <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:block">
            Workspace
          </p>
          <NavLinks items={nav} />
        </nav>
        <div className="hidden border-t border-black/[0.07] p-4 lg:mt-auto lg:block">
          <p className="truncate text-[11.5px] text-slate-500" title={userLine}>
            {userLine}
          </p>
          <form action={logout} className="mt-2.5">
            <button type="submit" className="btn btn-ghost btn-sm w-full">
              Log out
            </button>
          </form>
          <p className="mt-3 font-mono text-[10px] text-slate-400">Build {APP_VERSION}</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-11 items-center justify-end gap-3 border-b border-black/[0.06] px-4 sm:px-6 lg:hidden">
          <p className="truncate text-[11.5px] text-slate-500">{userLine}</p>
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Log out
            </button>
          </form>
        </header>
        <main className="p-4 sm:p-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
