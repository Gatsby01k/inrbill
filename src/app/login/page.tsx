import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { Logo } from "@/components/site/nav";
import { getSession, roleHome } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(roleHome(session.user.role));
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7">
          <h1 className="text-lg font-semibold text-slate-100">Sign in to your workspace</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Company, partner and operations access.
          </p>
          <div className="mt-6">
            <LoginForm next={next} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
          New here?{" "}
          <Link href="/request" className="text-gold-400 hover:underline">
            Submit a request
          </Link>{" "}
          or{" "}
          <Link href="/apply" className="text-gold-400 hover:underline">
            apply as a partner
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
