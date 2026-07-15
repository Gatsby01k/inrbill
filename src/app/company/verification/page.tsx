import { startVerification } from "@/app/actions/network-os";
import { EvidenceUpload } from "@/components/workspace/evidence-upload";
import { Flash } from "@/components/workspace/flash";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireVerifiedRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getCompanyOrganization } from "@/lib/network";

export default async function CompanyVerificationPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [user, flash] = await Promise.all([requireVerifiedRole("COMPANY"), searchParams]); const organization = await getCompanyOrganization(user);
  const item = await db.verificationCase.findFirst({ where: { organizationId: organization.id }, include: { checks: true, evidence: true }, orderBy: { createdAt: "desc" } });
  return <><PageHeader title="Organization verification" sub="A reusable, evidence-backed trust case. No automated approval and no public document links." /><Flash {...flash} />{!item ? <div className="card p-6"><EmptyState title="Verification not started" body="Start the case when you are ready to supply entity and bank evidence." /><form action={startVerification} className="mt-4 text-center"><input type="hidden" name="subject" value="organization" /><button className="btn btn-gold">Start verification</button></form></div> : <div className="space-y-5"><div className="card p-5"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-gold-700">{item.reference}</span><StatusBadge status={item.status} />{item.expiresAt ? <span className="ml-auto text-xs text-slate-400">valid to {fmtDate(item.expiresAt)}</span> : null}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{item.checks.map((check) => <div className="rounded-lg border border-black/[0.08] p-3" key={check.id}><p className="text-xs font-semibold">{check.type.replaceAll("_", " ")}</p><div className="mt-2"><StatusBadge status={check.status} /></div>{check.summary ? <p className="mt-2 text-xs text-slate-500">{check.summary}</p> : null}</div>)}</div></div><div className="card p-5"><h2 className="text-sm font-semibold">Restricted evidence vault</h2><div className="mt-4"><EvidenceUpload caseId={item.id} /></div><div className="mt-5 space-y-2">{item.evidence.map((evidence) => <div className="flex items-center gap-3 rounded-lg border border-black/[0.08] p-3" key={evidence.id}><span className="text-xs font-medium">{evidence.title}</span><StatusBadge status={evidence.status} /><span className="ml-auto text-[11px] text-slate-400">{evidence.kind.replaceAll("_", " ")}</span></div>)}</div></div></div>}</>;
}
