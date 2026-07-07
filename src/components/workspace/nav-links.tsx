"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center whitespace-nowrap rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors duration-150",
              active
                ? "bg-white/[0.06] text-slate-50"
                : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200",
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-gold-400" />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
