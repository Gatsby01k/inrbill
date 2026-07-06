import { WorkspaceShell } from "@/components/workspace/shell";
import { requireRole } from "@/lib/auth";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("PARTNER");
  return (
    <WorkspaceShell
      badge="Partner"
      badgeTone="emerald"
      userLine={user.email}
      nav={[
        { href: "/partner", label: "Overview", exact: true },
        { href: "/partner/profile", label: "Profile & capacity" },
      ]}
    >
      {children}
    </WorkspaceShell>
  );
}
