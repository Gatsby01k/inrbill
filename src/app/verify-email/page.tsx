import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";
import { EmailVerificationButton } from "@/components/forms/password-reset-form";
import { getSession, roleHome } from "@/lib/auth";

export const metadata: Metadata = { title: "Email verification", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ status }, session] = await Promise.all([searchParams, getSession()]);
  const verified = status === "verified" || Boolean(session?.user.emailVerifiedAt);
  const pending = status === "pending" && Boolean(session) && !verified;
  const home = session ? roleHome(session.user.role) : "/login";
  return <div className="hero-aurora flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-[420px]"><div className="mb-7 flex flex-col items-center gap-3"><BrandMark size={42} /><Wordmark /></div><div className="card p-7 text-center shadow-raised"><h1 className="text-base font-semibold">{verified ? "Email verified" : pending ? "Verify your email" : "Verification link unavailable"}</h1><p className="mt-3 text-xs leading-relaxed text-slate-500">{verified ? "This address is confirmed. You can now secure and open your workspace." : pending ? `We sent a single-use link to ${session!.user.email}. Workspace access remains sealed until you open it.` : "The link is invalid, expired or was already used. Sign in to request another one."}</p>{pending ? <EmailVerificationButton /> : null}{!pending ? <Link href={home} className="btn btn-gold mt-6">{verified && session ? "Open workspace" : "Return to login"}</Link> : null}</div></div></div>;
}
