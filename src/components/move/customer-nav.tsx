import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/format";

const items = [
  { href: "/", label: "Move", icon: "↔" },
  { href: "/orders", label: "Orders", icon: "≡" },
  { href: "/receive", label: "Receive", icon: "↓" },
  { href: "/account", label: "Account", icon: "○" },
] as const;

export function CustomerNav({
  active = "Move",
  authenticated,
}: {
  active?: (typeof items)[number]["label"];
  authenticated: boolean;
}) {
  return (
    <>
      <header className="move-topbar">
        <Link href="/" className="move-brand" aria-label="INRP2P">
          <BrandLockup markSize={29} />
        </Link>
        <nav aria-label="Primary navigation" className="move-desktop-nav">
          {items.map((item) => (
            <Link
              key={item.label}
              href={!authenticated && item.href !== "/" ? "/auth/customer" : item.href}
              className={cn(active === item.label && "is-active")}
              aria-current={active === item.label ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span aria-hidden className="move-member-link" />
      </header>
      <nav aria-label="Mobile navigation" className="move-bottom-nav">
        {items.map((item) => (
          <Link
            key={item.label}
            href={!authenticated && item.href !== "/" ? "/auth/customer" : item.href}
            className={cn(active === item.label && "is-active")}
            aria-current={active === item.label ? "page" : undefined}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
