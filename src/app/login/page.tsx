import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { AuthFrame } from "@/components/site/auth-frame";
import { getSession, roleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(roleHome(session.user.role));
  const { next } = await searchParams;

  return (
    <AuthFrame eyebrow="Secure workspace" title="Welcome back." sub="Sign in as network operations, a company or a liquidity partner.">
      <LoginForm next={next} />
      <p className="fin-auth-new">New to the network? <Link href="/request">Request access</Link> or <Link href="/apply">apply as a partner</Link>.</p>
    </AuthFrame>
  );
}
