import type { Metadata } from "next";
import { BrandMark, Wordmark } from "@/components/brand";
import { ForgotPasswordForm } from "@/components/forms/password-reset-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <div className="hero-aurora flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-[400px]"><div className="mb-7 flex flex-col items-center gap-3"><BrandMark size={42} /><Wordmark /></div><div className="card p-7 shadow-raised"><h1 className="text-base font-semibold">Reset password</h1><p className="mt-2 text-xs leading-relaxed text-slate-500">We send a short-lived link without revealing whether an account exists.</p><div className="mt-6"><ForgotPasswordForm /></div></div></div></div>;
}
