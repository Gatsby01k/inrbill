import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addBankAccount,
  addUpiHandle,
  addWallet,
} from "@/app/actions/payment-methods";
import { startCustomerVerification } from "@/app/actions/customer";
import { CustomerShell } from "@/components/move/customer-shell";
import {
  MoveConfirmation,
  type MoveMethodOption,
} from "@/components/move/move-confirmation";
import { EvidenceUpload } from "@/components/workspace/evidence-upload";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  claimQuoteForCustomer,
  OrderEngineError,
  refreshQuoteForCustomer,
} from "@/lib/order-engine";
import { pendingQuoteClaim } from "@/lib/pending-quote";

export const metadata: Metadata = {
  title: "Confirm move",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function methodOption(method: {
  id: string;
  label: string;
  maskedLabel: string;
  status: string;
  type: string;
}): MoveMethodOption {
  return {
    id: method.id,
    label: method.label,
    maskedLabel: method.maskedLabel,
    status: method.status,
    type: method.type,
  };
}

export default async function MovePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ quoteId }, flash, session] = await Promise.all([params, searchParams, getSession()]);
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect(`/auth/customer?quote=${encodeURIComponent(quoteId)}`);
  }
  const existingOrder = await db.order.findUnique({
    where: { quoteId },
    select: { reference: true },
  });
  if (existingOrder) redirect(`/orders/${existingOrder.reference}`);

  const pending = await pendingQuoteClaim(quoteId);
  let quote;
  try {
    quote = await claimQuoteForCustomer(
      quoteId,
      session.user.customer.id,
      Boolean(pending),
    );
  } catch (error) {
    if (error instanceof OrderEngineError && error.code === "QUOTE_EXPIRED") {
      try {
        const refreshed = await refreshQuoteForCustomer(quoteId, session.user.customer.id);
        if (refreshed.orderReference) redirect(`/orders/${refreshed.orderReference}`);
        if (refreshed.quoteId) redirect(`/move/${refreshed.quoteId}?notice=${encodeURIComponent("Quote refreshed with current terms.")}`);
      } catch {
        return (
          <CustomerShell active="Move">
            <section className="move-panel move-unavailable-panel">
              <p className="move-eyebrow">Quote unavailable</p>
              <h1>Current execution terms could not be refreshed.</h1>
              <p>No estimate has been substituted. Return to the amount screen and try again.</p>
              <Link href="/" className="move-primary-button">Request fresh quote</Link>
            </section>
          </CustomerShell>
        );
      }
    }
    if (
      error instanceof OrderEngineError &&
      error.code === "RECEIVE_LINK_UNAVAILABLE"
    ) {
      return (
        <CustomerShell active="Move">
          <section className="move-panel move-unavailable-panel">
            <p className="move-eyebrow">Payment request unavailable</p>
            <h1>This link expired, was revoked, or reached its usage limit.</h1>
            <p>No conversion or transfer was executed.</p>
            <Link href="/" className="move-primary-button">Start a new move</Link>
          </section>
        </CustomerShell>
      );
    }
    redirect("/?quote=expired");
  }

  const [methods, verificationCase, recipientProfile] = await Promise.all([
    db.paymentMethod.findMany({
      where: {
        customerId: session.user.customer.id,
        status: { notIn: ["DISABLED", "REJECTED"] },
      },
      orderBy: [{ isDefaultSend: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        maskedLabel: true,
        status: true,
        type: true,
        purpose: true,
      },
    }),
    db.verificationCase.findFirst({
      where: { customerId: session.user.customer.id },
      orderBy: { createdAt: "desc" },
      include: { evidence: { orderBy: { createdAt: "desc" } } },
    }),
    quote.recipientCustomerId
      ? db.receiveProfile.findFirst({
          where: {
            customerId: quote.recipientCustomerId,
            available: true,
            primaryMethodId: { not: null },
          },
          include: {
            primaryMethod: {
              select: {
                id: true,
                label: true,
                maskedLabel: true,
                status: true,
                type: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const isInrToUsdt = quote.direction === "INR_TO_USDT";
  const sourceTypes = isInrToUsdt
    ? new Set(["BANK_ACCOUNT", "UPI_HANDLE"])
    : new Set(["USDT_WALLET"]);
  const destinationTypes = isInrToUsdt
    ? new Set(["USDT_WALLET"])
    : new Set(["BANK_ACCOUNT", "UPI_HANDLE"]);
  const sourceMethods = methods
    .filter(
      (method) =>
        sourceTypes.has(method.type) &&
        (method.purpose === "SEND" || method.purpose === "BOTH"),
    )
    .map(methodOption);
  const destinationMethods = methods
    .filter(
      (method) =>
        destinationTypes.has(method.type) &&
        (method.purpose === "RECEIVE" || method.purpose === "BOTH"),
    )
    .map(methodOption);
  const recipientDestination = recipientProfile?.primaryMethod
    ? methodOption(recipientProfile.primaryMethod)
    : null;
  const complianceReady =
    session.user.customer.complianceStatus === "VERIFIED" &&
    verificationCase?.status === "APPROVED" &&
    Boolean(verificationCase.expiresAt && verificationCase.expiresAt > new Date());
  const back = `/move/${quote.id}`;

  return (
    <CustomerShell active="Move">
      <div className="move-step-header">
        <Link href="/" className="move-back-link">← Amount</Link>
        <div>
          <p className="move-eyebrow">Final confirmation</p>
          <h1>Only the details this move needs.</h1>
        </div>
        <span>Quote {Math.max(0, Math.ceil((quote.expiresAt.getTime() - Date.now()) / 1_000))}s</span>
      </div>

      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}
      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}

      <div className="move-setup-grid">
        <MoveConfirmation
          quote={{
            id: quote.id,
            sendAmount: quote.sendAmount.toString(),
            sendCurrency: quote.sendCurrency as "INR" | "USDT",
            receiveAmount: quote.receiveAmount.toString(),
            receiveCurrency: quote.receiveCurrency as "INR" | "USDT",
            rate: quote.rate.toString(),
            feeAmount: quote.feeAmount.toString(),
            feeCurrency: quote.feeCurrency as "INR" | "USDT",
            expiresAt: quote.expiresAt.toISOString(),
          }}
          sourceMethods={sourceMethods}
          destinationMethods={destinationMethods}
          sourceHintId={quote.sourceMethodHintId}
          destinationHintId={quote.destinationMethodHintId}
          recipientDestination={recipientDestination}
          complianceReady={complianceReady}
        />

        <aside className="move-setup-aside">
          <section className="move-panel move-compliance-card">
            <div className="move-section-heading">
              <div>
                <p className="move-eyebrow">Required check</p>
                <h2>Identity and compliance</h2>
              </div>
              <span data-status={session.user.customer.complianceStatus}>
                {session.user.customer.complianceStatus.toLowerCase().replaceAll("_", " ")}
              </span>
            </div>
            {complianceReady ? (
              <p className="move-positive-line">Approved and unexpired.</p>
            ) : !verificationCase ? (
              <>
                <p>Start only the checks required to move funds. No full company onboarding.</p>
                <form action={startCustomerVerification}>
                  <input type="hidden" name="back" value={back} />
                  <button className="move-secondary-button">Start verification</button>
                </form>
              </>
            ) : (
              <>
                <p>
                  Case {verificationCase.reference} ·{" "}
                  {verificationCase.status.toLowerCase().replaceAll("_", " ")}
                </p>
                {verificationCase.status === "IN_PROGRESS" ||
                verificationCase.status === "NEEDS_REVIEW" ? (
                  <EvidenceUpload caseId={verificationCase.id} />
                ) : null}
                {verificationCase.evidence.length ? (
                  <ul className="move-evidence-list">
                    {verificationCase.evidence.map((evidence) => (
                      <li key={evidence.id}>
                        <span>{evidence.title}</span>
                        <em>{evidence.status.toLowerCase()}</em>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </section>

          <section className="move-panel move-add-methods">
            <div className="move-section-heading">
              <div>
                <p className="move-eyebrow">Saved methods</p>
                <h2>Add only what is missing</h2>
              </div>
            </div>

            {isInrToUsdt ? (
              <>
                <details open={sourceMethods.length === 0}>
                  <summary>Add INR payment source</summary>
                  <form action={addUpiHandle} className="move-compact-form">
                    <input type="hidden" name="back" value={back} />
                    <input type="hidden" name="purpose" value="SEND" />
                    <label><span>Label</span><input name="label" className="input" placeholder="My UPI" /></label>
                    <label><span>UPI ID</span><input name="upiId" className="input" placeholder="name@bank" required /></label>
                    <button className="move-secondary-button">Save UPI source</button>
                  </form>
                  <div className="move-form-or">or bank / IMPS</div>
                  <form action={addBankAccount} className="move-compact-form">
                    <input type="hidden" name="back" value={back} />
                    <input type="hidden" name="purpose" value="SEND" />
                    <label><span>Bank name</span><input name="bankName" className="input" required /></label>
                    <label><span>Account holder</span><input name="accountHolder" className="input" required /></label>
                    <label><span>Account number</span><input name="accountNumber" className="input" inputMode="numeric" required /></label>
                    <label><span>IFSC</span><input name="ifsc" className="input" autoCapitalize="characters" required /></label>
                    <button className="move-secondary-button">Save bank source</button>
                  </form>
                </details>
                {!recipientDestination ? (
                  <details open={destinationMethods.length === 0}>
                    <summary>Add USDT destination</summary>
                    <form action={addWallet} className="move-compact-form">
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="purpose" value="RECEIVE" />
                      <label><span>Label</span><input name="label" className="input" placeholder="Primary wallet" /></label>
                      <label><span>Network</span><select name="network" className="input" defaultValue="TRC20"><option>TRC20</option><option>ERC20</option><option>POLYGON</option></select></label>
                      <label><span>Wallet address</span><input name="address" className="input" autoComplete="off" spellCheck={false} required /></label>
                      <button className="move-secondary-button">Validate and save wallet</button>
                    </form>
                  </details>
                ) : null}
              </>
            ) : (
              <>
                <details open={sourceMethods.length === 0}>
                  <summary>Add USDT source wallet</summary>
                  <form action={addWallet} className="move-compact-form">
                    <input type="hidden" name="back" value={back} />
                    <input type="hidden" name="purpose" value="SEND" />
                    <label><span>Label</span><input name="label" className="input" placeholder="Funding wallet" /></label>
                    <label><span>Network</span><select name="network" className="input" defaultValue="TRC20"><option>TRC20</option><option>ERC20</option><option>POLYGON</option></select></label>
                    <label><span>Wallet address</span><input name="address" className="input" autoComplete="off" spellCheck={false} required /></label>
                    <button className="move-secondary-button">Validate and save wallet</button>
                  </form>
                </details>
                {!recipientDestination ? (
                  <details open={destinationMethods.length === 0}>
                    <summary>Add INR destination</summary>
                    <form action={addUpiHandle} className="move-compact-form">
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="purpose" value="RECEIVE" />
                      <label><span>Label</span><input name="label" className="input" placeholder="Primary UPI" /></label>
                      <label><span>UPI ID</span><input name="upiId" className="input" placeholder="name@bank" required /></label>
                      <button className="move-secondary-button">Save UPI destination</button>
                    </form>
                    <div className="move-form-or">or bank / IMPS</div>
                    <form action={addBankAccount} className="move-compact-form">
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="purpose" value="RECEIVE" />
                      <label><span>Bank name</span><input name="bankName" className="input" required /></label>
                      <label><span>Account holder</span><input name="accountHolder" className="input" required /></label>
                      <label><span>Account number</span><input name="accountNumber" className="input" inputMode="numeric" required /></label>
                      <label><span>IFSC</span><input name="ifsc" className="input" autoCapitalize="characters" required /></label>
                      <button className="move-secondary-button">Save bank destination</button>
                    </form>
                  </details>
                ) : null}
              </>
            )}
            <p className="move-method-security">
              INRP2P never requests a bank password, wallet private key or seed phrase.
            </p>
          </section>
        </aside>
      </div>
    </CustomerShell>
  );
}
