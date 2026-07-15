import type { Metadata } from "next";
import { BrandMark, Wordmark } from "@/components/brand";
import { ResetPasswordForm } from "@/components/forms/password-reset-form";

export const metadata: Metadata = { title: "Choose new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <div className="hero-aurora flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-[400px]"><div className="mb-7 flex flex-col items-center gap-3"><BrandMark size={42} /><Wordmark /></div><div className="card p-7 shadow-raised"><h1 className="text-base font-semibold">Choose a new password</h1><p className="mt-2 text-xs leading-relaxed text-slate-500">The link is single-use. A successful reset signs out every device.</p><div className="mt-6"><ResetPasswordForm token={token} /></div></div></div></div>;
}
