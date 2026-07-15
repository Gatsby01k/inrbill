import type { Metadata } from "next";
import Link from "next/link";
import { EmailVerificationButton } from "@/components/forms/password-reset-form";
import { AuthFrame } from "@/components/site/auth-frame";
import { getSession, roleHome } from "@/lib/auth";

export const metadata: Metadata = { title: "Email verification", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ status }, session] = await Promise.all([searchParams, getSession()]);
  const verified = status === "verified" || Boolean(session?.user.emailVerifiedAt);
  const pending = status === "pending" && Boolean(session) && !verified;
  const home = session ? roleHome(session.user.role) : "/login";
  const title = verified ? "Email verified." : pending ? "Verify your email." : "Link unavailable.";
  const copy = verified ? "This address is confirmed. You can now secure and open your workspace." : pending ? `We sent a single-use link to ${session!.user.email}. Workspace access remains sealed until you open it.` : "The link is invalid, expired or was already used. Sign in to request another one.";
  return <AuthFrame centered eyebrow="Email ownership" title={title} sub={copy}>{pending ? <EmailVerificationButton /> : null}{!pending ? <Link href={home} className="btn btn-gold w-full">{verified && session ? "Open workspace" : "Return to login"}</Link> : null}</AuthFrame>;
}
