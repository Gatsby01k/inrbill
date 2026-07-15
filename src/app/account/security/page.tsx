import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailVerificationButton, WorkspacePasswordForm } from "@/components/forms/password-reset-form";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Account security", robots: { index: false, follow: false } };

export default async function AccountSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account/security");
  return <div className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6"><PageHeader title="Account security" sub="Set a private password, verify your address and keep recovery under your control." /><div className="grid gap-5 md:grid-cols-[1fr_360px]"><div className="card p-5"><p className="text-xs font-semibold text-slate-500">Account</p><p className="mt-2 text-sm font-medium">{session.user.email}</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={session.user.emailVerifiedAt ? "EMAIL_VERIFIED" : "EMAIL_UNVERIFIED"} /><StatusBadge status={session.user.totpEnabled ? "2FA_ENABLED" : "2FA_DISABLED"} /></div>{!session.user.emailVerifiedAt ? <EmailVerificationButton /> : null}<p className="mt-5 text-xs leading-relaxed text-slate-500">A password reset revokes every session. Changing the password here preserves only this session.</p></div><div className="card p-5">{session.user.emailVerifiedAt ? <WorkspacePasswordForm bootstrap={session.user.mustSetPassword} /> : <div className="rounded-lg border border-gold-500/25 bg-gold-500/[0.05] p-4 text-xs leading-relaxed text-slate-600">Open the single-use link sent to your email before setting a password. This prevents another person from claiming your address.</div>}</div></div></div>;
}
