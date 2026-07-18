import { notFound } from "next/navigation";
import { decideVerification, reviewEvidence } from "@/app/actions/network-os";
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
  const requiredEvidenceCount = item.partnerId ? 4 : 1;
  const readyEvidenceCount = item.partnerId
    ? [
        completedUploads.some((evidence) => !["REJECTED", "EXPIRED"].includes(evidence.status) && ["IDENTITY_DOCUMENT", "PAN", "DIRECTOR_ID"].includes(evidence.kind)),
        presentKinds.has("BANK_PROOF"),
        presentKinds.has("WALLET_REPORT"),
        presentKinds.has("VIDEO_VERIFICATION"),
      ].filter(Boolean).length
    : Math.min(completedUploads.length, 1);

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
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.07] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">Restricted evidence</h2>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Open every required file, verify that it belongs to the applicant, then accept or reject it.
                </p>
              </div>
              <span className={ready ? "rounded-full bg-leaf-500/10 px-3 py-1.5 text-xs font-semibold text-leaf-700" : "rounded-full bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-700"}>
                {readyEvidenceCount}/{requiredEvidenceCount} ready
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {item.evidence.map((evidence) => (
                <div className="rounded-xl border border-black/[0.08] p-3 sm:p-4" key={evidence.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words text-xs font-semibold text-slate-800">{evidence.title}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{evidence.kind.replaceAll("_", " ")}</span>
                    <span className="text-[11px] text-slate-400 sm:ml-auto">{evidence.byteSize >= 1024 * 1024 ? `${(evidence.byteSize / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(evidence.byteSize / 1024)} KB`}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a className="btn btn-ghost btn-sm flex-1 sm:flex-none" href={`/api/evidence/${evidence.id}`} target="_blank" rel="noreferrer">Open evidence</a>
                    <StatusBadge status={evidence.status} />
                  </div>
                  <form action={reviewEvidence} className="mt-2 grid grid-cols-2 gap-2 sm:flex">
                    <input type="hidden" name="artifactId" value={evidence.id} />
                    <button className="btn btn-ghost btn-sm sm:min-w-24" name="decision" value="accept">Accept file</button>
                    <button className="btn btn-ghost btn-sm sm:min-w-24" name="decision" value="reject">Reject file</button>
                  </form>
                </div>
              ))}
              {!item.evidence.length ? (
                <div className="rounded-xl border border-dashed border-black/[0.12] px-4 py-8 text-center text-xs text-slate-500">
                  No evidence has been uploaded yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="card h-fit p-4 sm:p-5 xl:sticky xl:top-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Human decision</h2>
            <span className={ready ? "text-xs font-semibold text-leaf-700" : "text-xs font-semibold text-gold-700"}>{ready ? "Evidence ready" : "Evidence incomplete"}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Approval is never automatic. {item.partnerId ? "Open and review the four required files" : "Open and review the submitted evidence"}, then record your rationale. {item.partnerId ? "Approval updates the Trust Passport and partner status together." : "Approval completes the organization case."}
          </p>
          <form action={decideVerification} className="mt-4 space-y-3">
            <input type="hidden" name="caseId" value={item.id} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.05] p-3">
              <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#D97706]" type="checkbox" name="consolidatedReview" value="confirmed" />
              <span>
                <strong className="block text-xs font-semibold text-slate-800">I reviewed every required file</strong>
                <small className="mt-1 block text-[11px] leading-relaxed text-slate-500">I confirm that the evidence belongs to this applicant and supports the decision below.</small>
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
