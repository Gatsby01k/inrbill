import type { Metadata } from "next";
import Link from "next/link";
import { ClearDraft } from "@/components/forms/clear-draft";
import { AccessReveal } from "@/components/site/access-reveal";
import { FormShell } from "@/components/site/form-shell";
import { readAccessReveal } from "@/lib/auth";
import { db } from "@/lib/db";
import { directionLabel } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = { title: "Application received" };

/**
 * Live "is there actually demand here" preview for a just-applied partner.
 * Deliberately a plain direction-match count, not the full internal
 * compatibility score — this partner hasn't been verified yet, and scoring
 * in the verification/compliance signal would unfairly zero them out before
 * they've had a chance to be reviewed. Never throws: a DB hiccup just hides
 * this card instead of breaking the confirmation page.
 */
async function getOpenRequestPreview(reference: string) {
  try {
    const partner = await db.partnerProfile.findUnique({
      where: { reference },
      select: { directions: true },
    });
    if (!partner || partner.directions.length === 0) return null;

    const count = await db.liquidityRequest.count({
      where: {
        status: { in: ["SUBMITTED", "IN_REVIEW", "MATCHING"] },
        direction: { in: partner.directions },
      },
    });
    return { count, directions: partner.directions };
  } catch (err) {
    console.error("getOpenRequestPreview failed", err);
    return null;
  }
}

const REVIEW_STEPS = [
  {
    t: "Application review",
    d: "Operations reviews your declared directions, capacity, banking coverage and compliance readiness.",
  },
  {
    t: "Verification",
    d: "Expect a request for KYB documents and usually a short call. Verification can result in Verified or Limited status.",
  },
  {
    t: "Matching begins",
    d: "Once verified, you become eligible for matches. Your identity is only released to a company when an introduction is made.",
  },
];

export default async function ApplySubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const openPreview = ref && ref !== "received" ? await getOpenRequestPreview(ref) : null;
  const reveal = await readAccessReveal();
  return (
    <FormShell
      eyebrow="Application received"
      title="Your application is under review."
      sub="A partner workspace has been created for you — you are signed in and can track verification status there."
    >
      <div className="space-y-6">
        <ClearDraft draftKey="inrp2p-apply-draft-v1" />
        {reveal ? (
          <AccessReveal
            email={reveal.email}
            password={reveal.password}
            backPath={`/apply/submitted${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`}
          />
        ) : null}
        {ref && ref !== "received" ? (
          <div className="card flex items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Reference
              </p>
              <p className="mt-1 font-mono text-xl text-leaf-700">{ref}</p>
            </div>
            <Link href="/partner" className="btn btn-gold btn-sm">
              Open partner workspace
            </Link>
          </div>
        ) : null}

        {openPreview && openPreview.count > 0 ? (
          <div className="card flex items-start gap-3.5 border-leaf-500/25 bg-leaf-500/[0.06] px-6 py-5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf-500/15 text-leaf-700">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {openPreview.count} open {openPreview.count === 1 ? "request" : "requests"} in{" "}
                {openPreview.directions.length <= 2
                  ? openPreview.directions.map(directionLabel).join(" / ")
                  : "your declared directions"}{" "}
                right now
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                Real demand on your corridor today — you become eligible to be matched against it
                as soon as verification clears.
              </p>
            </div>
          </div>
        ) : null}

        <div className="card p-6 sm:p-7">
          <p className="eyebrow mb-5 text-leaf-600">Review process</p>
          <ol className="space-y-5">
            {REVIEW_STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-leaf-400/40 bg-leaf-400/10 font-mono text-xs text-leaf-700">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.t}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Have documents ready? Send them to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-600 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          quoting your reference to speed up verification.
        </p>
      </div>
    </FormShell>
  );
}
