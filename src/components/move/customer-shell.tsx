import { CustomerNav } from "@/components/move/customer-nav";

export function CustomerShell({
  active,
  authenticated = true,
  displayName,
  children,
}: {
  active: "Move" | "Orders" | "Receive" | "Account";
  authenticated?: boolean;
  displayName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="move-app">
      <CustomerNav active={active} authenticated={authenticated} displayName={displayName} />
      <main className="move-shell">{children}</main>
    </div>
  );
}
