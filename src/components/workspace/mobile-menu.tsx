"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/format";
import type { NavItem } from "./nav-links";

export function MobileWorkspaceMenu({
  nav,
  userLine,
}: {
  nav: NavItem[];
  userLine: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white/65 text-slate-700 lg:hidden"
        aria-label="Open workspace navigation"
        aria-expanded={open}
      >
        <span className="relative block h-3.5 w-4" aria-hidden>
          <i className="absolute left-0 top-0 h-px w-4 bg-current" />
          <i className="absolute left-0 top-[6px] h-px w-4 bg-current" />
          <i className="absolute left-0 top-3 h-px w-4 bg-current" />
        </span>
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[80] h-[100dvh] w-screen lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation">
          <button className="absolute inset-0 bg-[#07152e]/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Close workspace navigation" />
          <aside className="absolute bottom-0 right-0 top-0 flex w-[min(88vw,350px)] flex-col border-l border-black/[0.08] bg-[#F8F3EB] shadow-2xl">
            <div className="flex h-[64px] items-center justify-between border-b border-black/[0.07] px-5">
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-700">Workspace</p><p className="truncate text-xs text-slate-500">{userLine}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-lg text-slate-500" aria-label="Close workspace navigation">×</button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {nav.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={cn("flex min-h-12 items-center justify-between rounded-xl px-4 text-[14px] font-medium transition-colors", active ? "bg-[#07152e] text-white shadow-sm" : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900")}>
                      <span>{item.label}</span><span className={active ? "text-gold-300" : "text-slate-300"}>→</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            <div className="border-t border-black/[0.07] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <form action={logout}><button type="submit" className="btn btn-ghost w-full">Log out</button></form>
            </div>
          </aside>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
