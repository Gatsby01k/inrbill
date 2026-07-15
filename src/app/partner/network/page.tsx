import { respondNetworkInvitation } from "@/app/actions/network-os";
import { Flash } from "@/components/workspace/flash";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireVerifiedRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PartnerNetworkPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [user, flash] = await Promise.all([requireVerifiedRole("PARTNER"), searchParams]); const items = user.partner ? await db.companyPartnerConnection.findMany({ where: { partnerId: user.partner.id }, include: { organization: true }, orderBy: { createdAt: "desc" } }) : [];
  return <><PageHeader title="Company networks" sub="Companies invite you explicitly. You control which private networks can route offers to you." /><Flash {...flash} />{items.length ? <div className="space-y-3">{items.map((item) => <div className="card p-5" key={item.id}><div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">{item.organization.name}</h2><StatusBadge status={item.status} /></div>{item.status === "INVITED" ? <form action={respondNetworkInvitation} className="mt-4 flex gap-2"><input type="hidden" name="connectionId" value={item.id} /><button className="btn btn-gold btn-sm" name="decision" value="accept">Accept</button><button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button></form> : null}</div>)}</div> : <EmptyState title="No network invitations" body="A company can invite the email attached to this partner account." />}</>;
}
