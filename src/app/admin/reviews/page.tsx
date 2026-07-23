import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export default async function AdminReviewsPage() {
  const items = await db.verificationCase.findMany({
    include: {
      partner: true,
      organization: true,
      customer: { include: { user: { select: { email: true, name: true } } } },
      _count: { select: { checks: true, evidence: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <><PageHeader title="Verification review" sub="Provider results, restricted evidence and accountable human decisions in one queue." />{items.length ? <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Reference</th><th>Subject</th><th>Checks</th><th>Evidence</th><th>Status</th><th>Opened</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><Link className="font-mono text-xs text-gold-700 hover:underline" href={`/admin/reviews/${item.id}`}>{item.reference}</Link></td><td>{item.partner?.displayName ?? item.organization?.name ?? item.customer?.user.email ?? "Unknown"}</td><td>{item._count.checks}</td><td>{item._count.evidence}</td><td><StatusBadge status={item.status} /></td><td>{fmtDate(item.createdAt)}</td></tr>)}</tbody></table></div></div> : <EmptyState title="No verification cases" body="Cases appear when a customer, company, or partner starts verification." />}</>;
}
