import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { CustomerOtpForm } from "@/components/forms/customer-otp-form";
import { getSession } from "@/lib/auth";
import { formatCurrencyAmount } from "@/lib/amount";
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
        <BrandLockup href="/" markSize={28} />
        <Link href="/" className="move-text-link">
          Back
        </Link>
      </header>
      <section className="move-auth-card">
        <div className="move-auth-step"><span>02</span><p>Sign in</p></div>
        <p className="move-eyebrow">Secure continuation</p>
        <h1>Sign in. Your move stays here.</h1>
        <p>
          We use a short-lived email code until a production SMS provider is configured.
          Member and operator access remains separate.
        </p>
        {pending ? (
          <div className="move-auth-quote" aria-label="Pending quote">
            <div>
              <span>You send</span>
              <strong>
                {formatCurrencyAmount(
                  pending.sendAmount.toString(),
                  pending.sendCurrency as "INR" | "USDT",
                )}
              </strong>
            </div>
            <i aria-hidden>→</i>
            <div>
              <span>You receive</span>
              <strong>
                {formatCurrencyAmount(
                  pending.receiveAmount.toString(),
                  pending.receiveCurrency as "INR" | "USDT",
                )}
              </strong>
            </div>
          </div>
        ) : null}
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
