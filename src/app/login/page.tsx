import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/forms/login-form";
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
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <BrandMark size={42} />
          <Wordmark />
        </div>
        <div className="card p-7 shadow-raised">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            Sign in to your workspace
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Operations · Company · Partner
          </p>
          <div className="mt-6">
            <LoginForm next={next} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          New here?{" "}
          <Link href="/request" className="text-gold-600 transition-colors hover:text-gold-700">
            Submit a request
          </Link>{" "}
          or{" "}
          <Link href="/apply" className="text-gold-600 transition-colors hover:text-gold-700">
            apply as a partner
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
