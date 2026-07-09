import type { Metadata } from "next";
import Link from "next/link";
import { ClearDraft } from "@/components/forms/clear-draft";
import { FormShell } from "@/components/site/form-shell";
import { db } from "@/lib/db";
import { directionLabel } from "@/lib/format";
import { rankPartners } from "@/lib/matching";
import { CONTACT_EMAIL } from "@/lib/options";
import { COVERAGE_GAP_SCORE_THRESHOLD } from "@/lib/watchdogs";

export const metadata: Metadata = { title: "Request received" };

const NEXT_STEPS = [
  {
    t: "Manual review — within 24–48 hours",
    d: "Network operations reviews your requirements and KYB posture. We may reach out for clarification before anything moves.",
  },
  {
    t: "Matching",
    d: "If the request qualifies, we shortlist reviewed partners on direction, volume, banks, speed and working hours.",
  },
  {
    t: "Qualified introduction",
    d: "When a fit is confirmed on both sides, we release a direct introduction. Terms and settlement are agreed bilaterally between you and the partner.",
  },
];

/**
 * Live "does this actually stand a chance" preview — reuses the exact same
 * scoring the admin coverage-gap watchdog uses, so the number shown here
 * can never say something rosier than what operations itself would trust.
 * Never throws: a scoring/DB hiccup just hides this card, it never breaks
 * the confirmation page a company is looking at right after submitting.
 */
async function getMatchPreview(reference: string) {
  try {
    const request = await db.liquidityRequest.findUnique({
      where: { reference },
      select: {
        direction: true,
        banks: true,
        methods: true,
        dailyVolumeBand: true,
        jurisdiction: true,
        countriesInvolved: true,
      },
    });
    if (!request) return null;

    const eligiblePartners = await db.partnerProfile.findMany({
      where: { status: { in: ["VERIFIED", "LIMITED"] }, directions: { has: request.direction } },
    });
    const ranked = rankPartners(request, eligiblePartners, Math.max(eligiblePartners.length, 1));
    const count = ranked.filter((r) => r.score >= COVERAGE_GAP_SCORE_THRESHOLD).length;
    return { count, direction: request.direction };
  } catch (err) {
    console.error("getMatchPreview failed", err);
    return null;
  }
}

export default async function RequestSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const matchPreview = ref && ref !== "received" ? await getMatchPreview(ref) : null;
  return (
    <FormShell
      eyebrow="Request received"
      title="Your request is in the review queue."
      sub="A workspace account has been created for you — you are signed in and can track status, timeline and introductions there."
    >
      <div className="space-y-6">
        <ClearDraft />
        {ref && ref !== "received" ? (
          <div className="card flex items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Reference
              </p>
              <p className="mt-1 font-mono text-xl text-gold-700">{ref}</p>
            </div>
            <Link href="/company" className="btn btn-gold btn-sm">
              Open company workspace
            </Link>
          </div>
        ) : null}

        {matchPreview ? (
          <div className="card flex items-start gap-3.5 border-leaf-500/25 bg-leaf-500/[0.06] px-6 py-5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf-500/15 text-leaf-700">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {matchPreview.count > 0
                  ? `${matchPreview.count} reviewed ${matchPreview.count === 1 ? "partner" : "partners"} already cover ${directionLabel(matchPreview.direction)}`
                  : `No reviewed partner on ${directionLabel(matchPreview.direction)} yet`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                {matchPreview.count > 0
                  ? "This isn't a guarantee — operations still reviews and shortlists manually — but there's real coverage on your corridor today."
                  : "You'll be first in line the moment one is verified on this exact corridor — this happens continuously, not on a fixed schedule."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="card p-6 sm:p-7">
          <p className="eyebrow mb-5">What happens next</p>
          <ol className="space-y-5">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 font-mono text-xs text-gold-700">
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
          Questions in the meantime? Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-600 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          quoting your reference.
        </p>
      </div>
    </FormShell>
  );
}
