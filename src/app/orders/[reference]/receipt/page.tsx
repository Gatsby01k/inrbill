import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CustomerShell } from "@/components/move/customer-shell";
import { ReceiptActions } from "@/components/move/receipt-actions";
import { getSession } from "@/lib/auth";
import { formatCurrencyAmount, formatIndianNumber } from "@/lib/amount";
import { db } from "@/lib/db";
import { decryptSensitive } from "@/lib/financial-crypto";

export const metadata: Metadata = {
  title: "Move receipt",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function date(value: Date | null) {
  return value
    ? value.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Kolkata",
      })
    : "—";
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const [{ reference }, session] = await Promise.all([params, getSession()]);
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect("/auth/customer");
  }
  const order = await db.order.findFirst({
    where: { reference, customerId: session.user.customer.id },
    include: {
      sourcePaymentMethod: true,
      destinationPaymentMethod: { include: { wallet: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
      settlementAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();
  const payment = order.paymentAttempts[0] ?? null;
  const settlement = order.settlementAttempts[0] ?? null;
  let utr = payment?.utrMasked ?? null;
  let payoutReference = settlement?.payoutReferenceMasked ?? null;
  try {
    if (payment?.utrEncrypted) utr = decryptSensitive(payment.utrEncrypted);
    if (settlement?.payoutReferenceEncrypted) {
      payoutReference = decryptSensitive(settlement.payoutReferenceEncrypted);
    }
  } catch {
    // Masked references remain available if key rotation/configuration blocks decryption.
  }

  return (
    <CustomerShell active="Orders">
      <article className="move-receipt">
        <header>
          <div>
            <p className="move-eyebrow">INRP2P receipt</p>
            <h1>{order.reference}</h1>
          </div>
          <span data-status={order.status}>{order.status.toLowerCase().replaceAll("_", " ")}</span>
        </header>

        <div className="move-receipt-total">
          <strong>
            {formatCurrencyAmount(
              order.sendAmount.toString(),
              order.sendCurrency as "INR" | "USDT",
            )}
          </strong>
          <i aria-hidden>→</i>
          <strong>
            {formatCurrencyAmount(
              order.receiveAmount.toString(),
              order.receiveCurrency as "INR" | "USDT",
            )}
          </strong>
        </div>

        <dl>
          <div><dt>Order ID</dt><dd>{order.reference}</dd></div>
          <div><dt>Final status</dt><dd>{order.status.toLowerCase().replaceAll("_", " ")}</dd></div>
          <div><dt>Rate</dt><dd>₹{formatIndianNumber(order.rate.toString(), 4)} / USDT</dd></div>
          <div><dt>Fee</dt><dd>{formatCurrencyAmount(order.feeAmount.toString(), order.feeCurrency as "INR" | "USDT")}</dd></div>
          <div><dt>Payment source</dt><dd>{order.sourcePaymentMethod.maskedLabel}</dd></div>
          <div><dt>Destination</dt><dd>{order.destinationPaymentMethod.maskedLabel}</dd></div>
          <div><dt>Network</dt><dd>{order.destinationPaymentMethod.wallet?.network ?? settlement?.network ?? "Not applicable"}</dd></div>
          <div><dt>Created</dt><dd>{date(order.createdAt)}</dd></div>
          <div><dt>Payment submitted</dt><dd>{date(order.paymentSubmittedAt)}</dd></div>
          <div><dt>Payment confirmed</dt><dd>{date(order.paymentConfirmedAt)}</dd></div>
          <div><dt>Settlement sent</dt><dd>{date(order.settlementSentAt)}</dd></div>
          <div><dt>Completed</dt><dd>{date(order.completedAt)}</dd></div>
          {utr ? <div><dt>UTR</dt><dd className="move-break-value">{utr}</dd></div> : null}
          {payment?.txid ? <div><dt>Payment TXID</dt><dd className="move-break-value">{payment.txid}</dd></div> : null}
          {payoutReference ? <div><dt>Payout reference</dt><dd className="move-break-value">{payoutReference}</dd></div> : null}
          {settlement?.txid ? <div><dt>Settlement TXID</dt><dd className="move-break-value">{settlement.txid}</dd></div> : null}
        </dl>

        <footer>
          <p>
            This receipt records the server-side transaction state. It is not a licence,
            guarantee, or substitute for your bank or network statement.
          </p>
          <ReceiptActions />
        </footer>
      </article>
    </CustomerShell>
  );
}
