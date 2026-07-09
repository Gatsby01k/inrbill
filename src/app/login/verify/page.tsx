import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand";
import { TwoFactorForm } from "@/components/forms/two-factor-form";
import { getSession, getTwoFactorChallenge, roleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Verify",
  robots: { index: false, follow: false },
};

export default async function TwoFactorVerifyPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.user.role));

  const challenge = await getTwoFactorChallenge();
  if (!challenge) redirect("/login");

  return (
    <div className="hero-aurora flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <BrandMark size={42} />
          <Wordmark />
        </div>
        <div className="card p-7 shadow-raised">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            Two-factor verification
          </h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            Enter the 6-digit code from your authenticator app.
          </p>
          <div className="mt-6">
            <TwoFactorForm />
          </div>
        </div>
      </div>
    </div>
  );
}
