import type { Metadata } from "next";
import {
  cancelTotpEnrollment,
  confirmTotpEnrollment,
  disableTwoFactor,
  dismissBackupCodesReveal,
  readBackupCodesReveal,
  regenerateBackupCodes,
  startTotpEnrollment,
} from "@/app/actions/security";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError, PageHeader, SectionTitle } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { totpKeyUri } from "@/lib/totp";

export const metadata: Metadata = { title: "Security" };

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sessionUser = await requireRole("ADMIN");
  const { error } = await searchParams;
  const user = await db.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return null;

  const reveal = await readBackupCodesReveal();
  const pendingConfirm = !user.totpEnabled && !!user.totpSecret;

  return (
    <>
      <PageHeader
        title="Security"
        sub="Two-factor authentication for the admin panel. A stolen or guessed password alone won't be enough to get in."
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      {reveal ? (
        <div className="card mb-5 border-amber-500/40 bg-amber-500/[0.06] p-6">
          <SectionTitle title="Save your backup codes now" />
          <p className="mb-4 text-[12.5px] leading-relaxed text-slate-600">
            Each code works once, in place of your authenticator app, if you lose your device.
            This is the only time they&apos;re shown in full — store them somewhere safe (a
            password manager, not this chat).
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-black/10 bg-white p-4 font-mono text-[13px] text-slate-800 sm:grid-cols-4">
            {reveal.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <form action={dismissBackupCodesReveal} className="mt-4">
            <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Confirming…">
              I&apos;ve saved these codes
            </SubmitButton>
          </form>
        </div>
      ) : null}

      <div className="card p-6 sm:p-7">
        {user.totpEnabled ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="chip border-leaf-200 bg-leaf-50 text-leaf-700">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                Enabled
              </span>
              <p className="text-[13px] text-slate-600">
                {user.totpBackupCodes.length} backup code
                {user.totpBackupCodes.length === 1 ? "" : "s"} remaining
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <SectionTitle title="Regenerate backup codes" />
                <p className="mb-3 text-[12.5px] leading-relaxed text-slate-500">
                  Invalidates every existing backup code and issues a fresh set. Use this if you
                  think a code leaked, or you&apos;re running low.
                </p>
                <form action={regenerateBackupCodes} className="space-y-3">
                  <Field label="Confirm your password">
                    <input
                      name="password"
                      type="password"
                      className="input"
                      autoComplete="current-password"
                    />
                  </Field>
                  <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Regenerating…">
                    Regenerate codes
                  </SubmitButton>
                </form>
              </div>

              <div>
                <SectionTitle title="Disable two-factor" />
                <p className="mb-3 text-[12.5px] leading-relaxed text-slate-500">
                  Your account goes back to password-only. Not recommended — this is what
                  protects live payment operations.
                </p>
                <form action={disableTwoFactor} className="space-y-3">
                  <Field label="Confirm your password">
                    <input
                      name="password"
                      type="password"
                      className="input"
                      autoComplete="current-password"
                    />
                  </Field>
                  <SubmitButton className="btn btn-ghost btn-sm text-rose-600" pendingLabel="Disabling…">
                    Disable two-factor
                  </SubmitButton>
                </form>
              </div>
            </div>
          </>
        ) : pendingConfirm ? (
          <>
            <SectionTitle title="Finish setup" />
            <p className="mb-4 text-[12.5px] leading-relaxed text-slate-500">
              Add this to your authenticator app (Google Authenticator, Authy, 1Password…) —
              paste the key manually since there&apos;s no QR code here. Then enter the 6-digit
              code it generates to confirm.
            </p>
            <div className="mb-4 space-y-2 rounded-lg border border-black/10 bg-black/[0.02] p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Secret key
              </p>
              <p className="break-all font-mono text-[13px] text-slate-800">{user.totpSecret}</p>
              <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Setup URI
              </p>
              <p className="break-all font-mono text-[11px] text-slate-500">
                {totpKeyUri(user.totpSecret ?? "", user.email)}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <form action={confirmTotpEnrollment} className="flex flex-wrap items-end gap-3">
                <Field label="6-digit code" className="max-w-[160px]">
                  <input
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="input text-center font-mono tracking-[0.2em]"
                    placeholder="000000"
                    maxLength={6}
                  />
                </Field>
                <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Confirming…">
                  Confirm & enable
                </SubmitButton>
              </form>
              <form action={cancelTotpEnrollment}>
                <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Cancelling…">
                  Cancel setup
                </SubmitButton>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <span className="chip border-black/[0.09] bg-black/[0.03] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Not enabled
              </span>
            </div>
            <p className="mb-4 mt-3 max-w-xl text-[12.5px] leading-relaxed text-slate-500">
              Two-factor adds a second step at login — a 6-digit code from an authenticator app,
              on top of your password. Takes under a minute to set up.
            </p>
            <form action={startTotpEnrollment}>
              <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Starting…">
                Enable two-factor authentication
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </>
  );
}
