import type { Metadata } from "next";
import { reviewCustomerPaymentMethod } from "@/app/actions/customer-payment-methods-admin";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { decryptSensitive } from "@/lib/financial-crypto";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Customer payment methods" };
export const dynamic = "force-dynamic";

function exactDetails(method: {
  bankAccount: {
    accountHolderEncrypted: string;
    accountNumberEncrypted: string;
    ifscEncrypted: string;
    bankName: string;
  } | null;
  upiHandle: { handleEncrypted: string } | null;
  wallet: { addressEncrypted: string; network: string } | null;
}) {
  try {
    if (method.bankAccount) {
      return [
        `Holder: ${decryptSensitive(method.bankAccount.accountHolderEncrypted)}`,
        `Bank: ${method.bankAccount.bankName}`,
        `Account: ${decryptSensitive(method.bankAccount.accountNumberEncrypted)}`,
        `IFSC: ${decryptSensitive(method.bankAccount.ifscEncrypted)}`,
      ];
    }
    if (method.upiHandle) {
      return [`UPI ID: ${decryptSensitive(method.upiHandle.handleEncrypted)}`];
    }
    if (method.wallet) {
      return [
        `Network: ${method.wallet.network}`,
        `Address: ${decryptSensitive(method.wallet.addressEncrypted)}`,
      ];
    }
  } catch {
    return ["Encrypted details are unavailable. Do not approve until key access is restored."];
  }
  return ["Payment method details are incomplete."];
}

export default async function CustomerMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [flash, methods] = await Promise.all([
    searchParams,
    db.paymentMethod.findMany({
      where: { status: { in: ["UNVERIFIED", "FORMAT_VALIDATED"] } },
      include: {
        customer: {
          include: { user: { select: { email: true, name: true } } },
        },
        bankAccount: true,
        upiHandle: true,
        wallet: true,
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Customer payment methods"
        sub="Ownership review queue. Saved accounts are never described as live connected banks."
      />
      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}
      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}

      {methods.length ? (
        <div className="grid gap-4">
          {methods.map((method) => (
            <section key={method.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {method.type.replaceAll("_", " ")} · {method.purpose}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    {method.customer.user.email}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {method.label} · {method.maskedLabel} · saved {fmtDateTime(method.createdAt)}
                  </p>
                </div>
                <StatusBadge status={method.status} />
              </div>

              <details className="mt-4 rounded-xl border border-black/[0.08] bg-black/[0.02] p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                  Show restricted exact details
                </summary>
                <ul className="mt-3 grid gap-1 font-mono text-[10px] text-slate-600">
                  {exactDetails(method).map((line) => <li key={line} className="break-all">{line}</li>)}
                </ul>
              </details>

              <form action={reviewCustomerPaymentMethod} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_170px_auto_auto] lg:items-end">
                <input type="hidden" name="methodId" value={method.id} />
                <label><span className="lbl">Independent check reference</span><input name="providerReference" className="input" placeholder="Penny-drop / provider / signed challenge ref" /></label>
                <label><span className="lbl">Reason</span><input name="reason" className="input" minLength={8} maxLength={500} required /></label>
                <label><span className="lbl">Authenticator code</span><input name="totpCode" className="input tnum" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label>
                <button name="decision" value="verify" className="btn btn-gold">Verify ownership</button>
                <button name="decision" value="reject" className="btn btn-ghost">Reject</button>
              </form>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No payment methods need review"
          body="New manually saved bank, UPI, and format-validated wallet methods appear here."
        />
      )}
    </>
  );
}
