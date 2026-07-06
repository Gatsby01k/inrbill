import { WorkspaceShell } from "@/components/workspace/shell";
import { requireRole } from "@/lib/auth";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("COMPANY");
  return (
    <WorkspaceShell
      badge="Company"
      badgeTone="sky"
      userLine={user.email}
      nav={[
        { href: "/company", label: "My requests", exact: true },
        { href: "/company/new-request", label: "New request" },
      ]}
    >
      {children}
    </WorkspaceShell>
  );
}
