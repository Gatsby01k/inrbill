"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { SlidingIndicator } from "@/components/motion";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeHref =
    items.find((item) =>
      item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"),
    )?.href ?? "";

  return (
    <div
      ref={containerRef}
      className="relative flex w-full gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      <SlidingIndicator
        containerRef={containerRef}
        activeSelector={activeHref}
        className="border border-gold-600/25 shadow-[0_1px_2px_rgba(35,28,12,0.06)]"
      />
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : undefined}
            className={cn(
              "relative z-[1] flex items-center whitespace-nowrap rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors duration-200",
              active ? "text-slate-900" : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-800",
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-gold-600 transition-all duration-200" />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
