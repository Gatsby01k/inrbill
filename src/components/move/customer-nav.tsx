import Link from "next/link";
import { Wordmark } from "@/components/brand";
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
  displayName,
}: {
  active?: (typeof items)[number]["label"];
  authenticated: boolean;
  displayName?: string | null;
}) {
  const firstName = displayName?.trim().split(/\s+/)[0] || "Account";
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <>
      <header className="move-topbar">
        <Link href="/" className="move-brand" aria-label="INRP2P">
          <Wordmark className="move-brand-wordmark" />
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
        <div className="move-member-actions">
          {authenticated ? (
            <Link href="/account" className="move-account-link" aria-label={`Open ${firstName} account`}>
              <span aria-hidden>{initial}</span>
              <strong>{firstName}</strong>
            </Link>
          ) : (
            <Link href="/auth/customer" className="move-sign-in-link">
              Sign in
            </Link>
          )}
        </div>
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
