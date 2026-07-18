import { notFound } from "next/navigation";
import {
  decideVerification,
  reviewEvidence,
  reviewVerificationCheck,
  runVerificationProviderCheck,
} from "@/app/actions/network-os";
import { BackLink, PageHeader, StatusBadge } from "@/components/ui";
import { Flash } from "@/components/workspace/flash";
import { db } from "@/lib/db";

export default async function AdminReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const item = await db.verificationCase.findUnique({
    where: { id },
    include: {
      partner: true,
      organization: true,
      checks: { orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) notFound();

  const completedUploads = item.evidence.filter((evidence) => !!evidence.checksumSha256);
  const presentKinds = new Set(completedUploads.filter((evidence) => !["REJECTED", "EXPIRED"].includes(evidence.status)).map((evidence) => evidence.kind));
  const ready = item.partnerId
    ? [
        completedUploads.some((evidence) => !["REJECTED", "EXPIRED"].includes(evidence.status) && ["IDENTITY_DOCUMENT", "PAN", "DIRECTOR_ID"].includes(evidence.kind)),
        presentKinds.has("BANK_PROOF"),
        presentKinds.has("WALLET_REPORT"),
        presentKinds.has("VIDEO_VERIFICATION"),
      ].every(Boolean)
    : completedUploads.length > 0;

  return (
    <>
      <BackLink href="/admin/reviews" label="Verification queue" />
      <div className="mt-4">
        <PageHeader
          title={item.partner?.displayName ?? item.organization?.name ?? item.reference}
          sub={item.reference}
        />
      </div>
      <Flash {...flash} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold">Checks</h2>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-4 space-y-3">
              {item.checks.map((check) => (
                <div className="rounded-xl border border-black/[0.08] p-3 sm:p-4" key={check.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">{check.type.replaceAll("_", " ")}</span>
                    <StatusBadge status={check.status} />
                    <span className="text-[11px] text-slate-400 sm:ml-auto">{check.provider ?? "Not run"}</span>
                  </div>
                  {check.summary ? <p className="mt-2 text-xs text-slate-500">{check.summary}</p> : null}
                  <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                    <form action={runVerificationProviderCheck}>
                      <input type="hidden" name="checkId" value={check.id} />
                      <button className="btn btn-ghost btn-sm w-full sm:w-auto">Run provider adapter</button>
                    </form>
                    <form action={reviewVerificationCheck} className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      <input type="hidden" name="checkId" value={check.id} />
                      <input className="input col-span-3 h-10 py-1 text-xs sm:w-56" name="summary" placeholder="Human review note" />
                      <button className="btn btn-ghost btn-sm" name="status" value="PASSED">Pass</button>
                      <button className="btn btn-ghost btn-sm" name="status" value="REVIEW">Review</button>
                      <button className="btn btn-ghost btn-sm" name="status" value="FAILED">Fail</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Restricted evidence</h2>
            <div className="mt-4 space-y-3">
              {item.evidence.map((evidence) => (
                <div className="rounded-xl border border-black/[0.08] p-3 sm:p-4" key={evidence.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className="min-w-0 break-words text-xs font-semibold text-gold-700 hover:underline" href={`/api/evidence/${evidence.id}`}>{evidence.title}</a>
                    <StatusBadge status={evidence.status} />
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{evidence.kind.replaceAll("_", " ")}</span>
                    <span className="text-[11px] text-slate-400 sm:ml-auto">{evidence.byteSize >= 1024 * 1024 ? `${(evidence.byteSize / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(evidence.byteSize / 1024)} KB`}</span>
                  </div>
                  <form action={reviewEvidence} className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                    <input type="hidden" name="artifactId" value={evidence.id} />
                    <button className="btn btn-ghost btn-sm" name="decision" value="accept">Accept</button>
                    <button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="card h-fit p-4 sm:p-5 xl:sticky xl:top-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Human decision</h2>
            <span className={ready ? "text-xs font-semibold text-leaf-700" : "text-xs font-semibold text-gold-700"}>{ready ? "Evidence ready" : "Evidence incomplete"}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Approval is never automatic. {item.partnerId ? "Open the four restricted files" : "Open the submitted restricted evidence"}, confirm the consolidated review and record the rationale. {item.partnerId ? "The case and partner status update together." : "The case is then approved for the organization."}
          </p>
          <form action={decideVerification} className="mt-4 space-y-3">
            <input type="hidden" name="caseId" value={item.id} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.05] p-3">
              <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#D97706]" type="checkbox" name="consolidatedReview" value="confirmed" />
              <span>
                <strong className="block text-xs font-semibold text-slate-800">I reviewed the complete evidence set</strong>
                <small className="mt-1 block text-[11px] leading-relaxed text-slate-500">Pending required evidence will be accepted and incomplete checks will be recorded as waived by this human decision.</small>
              </span>
            </label>
            <textarea className="input min-h-24" name="note" placeholder="Decision rationale" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn btn-gold btn-sm" name="decision" value="approve" disabled={!ready}>Approve · 12 months</button>
              <button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button>
            </div>
          </form>
        </aside>
      </div>
    </>
  );
}
