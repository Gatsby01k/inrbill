import { dismissAccessReveal } from "@/app/actions/public";
import { SubmitButton } from "@/components/submit-button";

/**
 * One-time display of the auto-generated account password right after a
 * company/partner's first submission. No one invents a password mid-form —
 * this is the only place the plaintext ever surfaces, for as long as the
 * short-lived reveal cookie lives (see setAccessReveal in src/lib/auth.ts).
 */
export function AccessReveal({
  email,
  password,
  backPath,
}: {
  email: string;
  password: string;
  backPath: string;
}) {
  return (
    <div className="card border-gold-500/30 bg-gold-500/[0.04] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">
        Save your workspace access — shown once
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
        You&apos;re already signed in on this device. To log in again later (a different device, or
        after logging out), use:
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white px-3.5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
          <p className="mt-0.5 select-all break-all font-mono text-[13px] text-slate-800">{email}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white px-3.5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Password</p>
          <p className="mt-0.5 select-all break-all font-mono text-[13px] text-slate-800">{password}</p>
        </div>
      </div>
      <form action={dismissAccessReveal} className="mt-4">
        <input type="hidden" name="back" value={backPath} />
        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
          I&apos;ve saved this — hide it
        </SubmitButton>
      </form>
    </div>
  );
}
