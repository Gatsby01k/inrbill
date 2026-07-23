import { CustomerNav } from "@/components/move/customer-nav";

export function CustomerShell({
  active,
  authenticated = true,
  children,
}: {
  active: "Move" | "Orders" | "Receive" | "Account";
  authenticated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="move-app">
      <CustomerNav active={active} authenticated={authenticated} />
      <main className="move-shell">{children}</main>
    </div>
  );
}
