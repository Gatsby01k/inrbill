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
    <AuthFrame eyebrow="Member access" title="Open your workspace." sub="For approved companies, liquidity partners and network operations.">
      <LoginForm next={next} />
      <div className="fin-auth-entry-paths" aria-label="New applicant options">
        <Link href="/request">
          <span><small>For companies</small><strong>Request company access</strong></span>
          <i aria-hidden>→</i>
        </Link>
        <Link href="/apply">
          <span><small>For liquidity desks</small><strong>Apply as a partner</strong></span>
          <i aria-hidden>→</i>
        </Link>
      </div>
      <p className="fin-auth-support">Access problem? <a href="mailto:info@inrp2p.com">Contact network operations</a>.</p>
    </AuthFrame>
  );
}
