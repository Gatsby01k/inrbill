import Link from "next/link";
import { Logo } from "@/components/site/nav";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <Logo />
      <div className="card max-w-sm p-7 text-center">
        <p className="font-mono text-xs text-gold-400">404</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">
          This record doesn&apos;t exist
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          The page may have moved, or you may not have access to it from this
          account.
        </p>
        <Link href="/" className="btn btn-ghost btn-sm mt-5">
          Back to INRP2P
        </Link>
      </div>
    </div>
  );
}
