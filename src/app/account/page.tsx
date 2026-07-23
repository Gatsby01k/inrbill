import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { startCustomerVerification } from "@/app/actions/customer";
import {
  addBankAccount,
  addUpiHandle,
  addWallet,
  disablePaymentMethod,
} from "@/app/actions/payment-methods";
import { CustomerShell } from "@/components/move/customer-shell";
import { EvidenceUpload } from "@/components/workspace/evidence-upload";
import { getSession, roleHome } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  if (status === "FORMAT_VALIDATED") return "Address format validated";
  if (status === "OWNERSHIP_VERIFIED") return "Ownership verified";
  if (status === "UNVERIFIED") return "Saved · verification pending";
  return status.toLowerCase().replaceAll("_", " ");
}

export default async function CustomerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [session, flash] = await Promise.all([getSession(), searchParams]);
  if (!session) redirect("/auth/customer");
  if (session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect(roleHome(session.user.role));
  }
  const [methods, verificationCase] = await Promise.all([
    db.paymentMethod.findMany({
      where: { customerId: session.user.customer.id },
      include: { wallet: true },
      orderBy: { createdAt: "desc" },
    }),
    db.verificationCase.findFirst({
      where: { customerId: session.user.customer.id },
      orderBy: { createdAt: "desc" },
      include: { evidence: { orderBy: { createdAt: "desc" } } },
    }),
  ]);

  return (
    <CustomerShell active="Account">
      <div className="move-page-heading">
        <div>
          <p className="move-eyebrow">Account</p>
          <h1>Payment details stay private.</h1>
          <p>{session.user.email} · passwordless email OTP access</p>
        </div>
        <form action={logout}>
          <button className="move-secondary-button">Sign out</button>
        </form>
      </div>

      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}
      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}

      <div className="move-account-grid">
        <div className="move-account-main">
          <section className="move-panel move-method-manager">
            <div className="move-section-heading">
              <div>
                <p className="move-eyebrow">Saved payment methods</p>
                <h2>Sources and destinations</h2>
              </div>
              <span>{methods.filter((method) => method.status !== "DISABLED").length} active</span>
            </div>

            {methods.length ? (
              <div className="move-saved-methods">
                {methods.map((method) => (
                  <article key={method.id}>
                    <div>
                      <span>{method.type.toLowerCase().replaceAll("_", " ")}</span>
                      <strong>{method.label}</strong>
                      <small>{method.maskedLabel}</small>
                    </div>
                    <div>
                      <em data-status={method.status}>{statusLabel(method.status)}</em>
                      {method.status !== "DISABLED" ? (
                        <form action={disablePaymentMethod}>
                          <input type="hidden" name="back" value="/account" />
                          <input type="hidden" name="methodId" value={method.id} />
                          <button>Disable</button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="move-method-empty">
                No saved methods. Add only what your next move requires.
              </p>
            )}

            <div className="move-method-add-grid">
              <details>
                <summary>Add UPI ID</summary>
                <form action={addUpiHandle} className="move-compact-form">
                  <input type="hidden" name="back" value="/account" />
                  <input type="hidden" name="purpose" value="BOTH" />
                  <label><span>Label</span><input name="label" className="input" placeholder="Primary UPI" /></label>
                  <label><span>UPI ID</span><input name="upiId" className="input" placeholder="name@bank" required /></label>
                  <button className="move-secondary-button">Save UPI ID</button>
                </form>
              </details>

              <details>
                <summary>Add bank account</summary>
                <form action={addBankAccount} className="move-compact-form">
                  <input type="hidden" name="back" value="/account" />
                  <input type="hidden" name="purpose" value="BOTH" />
                  <label><span>Label</span><input name="label" className="input" placeholder="Primary bank" /></label>
                  <label><span>Bank name</span><input name="bankName" className="input" required /></label>
                  <label><span>Account holder</span><input name="accountHolder" className="input" required /></label>
                  <label><span>Account number</span><input name="accountNumber" className="input" inputMode="numeric" required /></label>
                  <label><span>IFSC</span><input name="ifsc" className="input" autoCapitalize="characters" required /></label>
                  <button className="move-secondary-button">Save bank account</button>
                </form>
              </details>

              <details>
                <summary>Add USDT wallet</summary>
                <form action={addWallet} className="move-compact-form">
                  <input type="hidden" name="back" value="/account" />
                  <input type="hidden" name="purpose" value="BOTH" />
                  <label><span>Label</span><input name="label" className="input" placeholder="Primary wallet" /></label>
                  <label><span>Network</span><select name="network" className="input" defaultValue="TRC20"><option>TRC20</option><option>ERC20</option><option>POLYGON</option></select></label>
                  <label><span>Wallet address</span><input name="address" className="input" autoComplete="off" spellCheck={false} required /></label>
                  <button className="move-secondary-button">Validate and save wallet</button>
                </form>
              </details>
            </div>
            <p className="move-method-security">
              Saved means encrypted storage, not a live bank connection. INRP2P never asks for a
              bank password, private key, or seed phrase.
            </p>
          </section>
        </div>

        <aside className="move-account-aside">
          <section className="move-panel move-compliance-card">
            <div className="move-section-heading">
              <div>
                <p className="move-eyebrow">Verification</p>
                <h2>Transaction readiness</h2>
              </div>
              <span data-status={session.user.customer.complianceStatus}>
                {session.user.customer.complianceStatus.toLowerCase().replaceAll("_", " ")}
              </span>
            </div>
            {!verificationCase ? (
              <>
                <p>Verification starts only when you choose it or a move requires it.</p>
                <form action={startCustomerVerification}>
                  <input type="hidden" name="back" value="/account" />
                  <button className="move-secondary-button">Start verification</button>
                </form>
              </>
            ) : (
              <>
                <p>
                  {verificationCase.reference} ·{" "}
                  {verificationCase.status.toLowerCase().replaceAll("_", " ")}
                </p>
                {["IN_PROGRESS", "NEEDS_REVIEW"].includes(verificationCase.status) ? (
                  <EvidenceUpload caseId={verificationCase.id} />
                ) : null}
              </>
            )}
          </section>

          <section className="move-panel">
            <p className="move-eyebrow">Controls</p>
            <nav className="move-account-links">
              <Link href="/receive">Receive Profile <span>→</span></Link>
              <Link href="/orders">Order history <span>→</span></Link>
              <Link href="/account/security">Password and recovery <span>→</span></Link>
            </nav>
          </section>
        </aside>
      </div>
    </CustomerShell>
  );
}
