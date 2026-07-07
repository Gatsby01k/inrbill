import type { Metadata } from "next";
import Link from "next/link";
import { FormShell } from "@/components/site/form-shell";
import { CONTACT_EMAIL } from "@/lib/options";

export const metadata: Metadata = { title: "Application received" };

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
  return (
    <FormShell
      eyebrow="Application received"
      title="Your application is under review."
      sub="A partner workspace has been created for you — you are signed in and can track verification status there."
    >
      <div className="space-y-6">
        {ref && ref !== "received" ? (
          <div className="card flex items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Reference
              </p>
              <p className="mt-1 font-mono text-xl text-emerald-700">{ref}</p>
            </div>
            <Link href="/partner" className="btn btn-gold btn-sm">
              Open partner workspace
            </Link>
          </div>
        ) : null}

        <div className="card p-6 sm:p-7">
          <p className="eyebrow mb-5 text-emerald-600">Review process</p>
          <ol className="space-y-5">
            {REVIEW_STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 font-mono text-xs text-emerald-700">
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
