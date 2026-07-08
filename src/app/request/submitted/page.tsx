import type { Metadata } from "next";
import Link from "next/link";
import { ClearDraft } from "@/components/forms/clear-draft";
import { FormShell } from "@/components/site/form-shell";
import { CONTACT_EMAIL } from "@/lib/options";

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

export default async function RequestSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
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
              <p className="mt-1 font-mono text-xl text-gold-400">{ref}</p>
            </div>
            <Link href="/company" className="btn btn-gold btn-sm">
              Open company workspace
            </Link>
          </div>
        ) : null}

        <div className="card p-6 sm:p-7">
          <p className="eyebrow mb-5">What happens next</p>
          <ol className="space-y-5">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 font-mono text-xs text-gold-400">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-50">{s.t}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Questions in the meantime? Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-400 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          quoting your reference.
        </p>
      </div>
    </FormShell>
  );
}
