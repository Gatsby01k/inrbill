import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { CustomerOtpForm } from "@/components/forms/customer-otp-form";
import { getSession } from "@/lib/auth";
import { pendingQuoteClaim } from "@/lib/pending-quote";

export const metadata: Metadata = {
  title: "Continue your move",
  robots: { index: false, follow: false },
};

export default async function CustomerAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const { quote } = await searchParams;
  const session = await getSession();
  if (session?.user.role === "CUSTOMER") {
    redirect(quote ? `/move/${encodeURIComponent(quote)}` : "/");
  }
  const pending = quote ? await pendingQuoteClaim(quote) : null;
  if (quote && !pending) redirect("/?quote=expired");

  return (
    <main className="move-auth-page">
      <header className="move-auth-header">
        <Link href="/" aria-label="INRP2P home">
          <BrandLockup markSize={28} />
        </Link>
        <Link href="/" className="move-text-link">
          Back
        </Link>
      </header>
      <section className="move-auth-card">
        <p className="move-eyebrow">Secure continuation</p>
        <h1>Your amount stays exactly where you left it.</h1>
        <p>
          Confirm your email only after seeing the quote. Member and operator access remains
          separate.
        </p>
        <CustomerOtpForm quoteId={pending?.id} />
        <div className="move-auth-divider">
          <span>Member workspace?</span>
        </div>
        <Link href="/login" className="move-secondary-button">
          Company, partner or operator login
        </Link>
      </section>
    </main>
  );
}
