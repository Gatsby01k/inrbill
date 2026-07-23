"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CustomerPaymentInstruction } from "@/lib/payment-instructions";
import { formatCurrencyAmount, formatIndianNumber } from "@/lib/amount";

export type CustomerOrderState = {
  reference: string;
  status: string;
  statusLabel: string;
  version: number;
  paymentDeadline: string | null;
  paymentSubmittedAt: string | null;
  paymentConfirmedAt: string | null;
  settlementSentAt: string | null;
  completedAt: string | null;
  payment: {
    status: string;
    rail: string;
    utrMasked: string | null;
    txid: string | null;
    submittedAt: string | null;
    detectedAt: string | null;
    confirmedAt: string | null;
  } | null;
  settlement: {
    status: string;
    network: string | null;
    txid: string | null;
    payoutReferenceMasked: string | null;
    sentAt: string | null;
    detectedAt: string | null;
    confirmedAt: string | null;
  } | null;
};

type OrderTruth = {
  reference: string;
  direction: "INR_TO_USDT" | "USDT_TO_INR";
  sendAmount: string;
  sendCurrency: "INR" | "USDT";
  receiveAmount: string;
  receiveCurrency: "INR" | "USDT";
  rate: string;
  feeAmount: string;
  feeCurrency: "INR" | "USDT";
  sourceMasked: string;
  destinationMasked: string;
  destinationNetwork: string | null;
  createdAt: string;
};

const STAGES = [
  { key: "payment", label: "Payment" },
  { key: "detected", label: "Detected" },
  { key: "processing", label: "Processing" },
  { key: "sent", label: "Sent" },
  { key: "complete", label: "Complete" },
] as const;

const STATUS_STAGE: Record<string, number> = {
  AWAITING_PAYMENT: 0,
  PAYMENT_SUBMITTED: 0,
  PAYMENT_DETECTED: 1,
  PAYMENT_CONFIRMED: 1,
  SETTLEMENT_PENDING: 2,
  SETTLEMENT_IN_PROGRESS: 2,
  SETTLEMENT_SENT: 3,
  CONFIRMING: 3,
  COMPLETED: 4,
};

const ACTIVE_STATUSES = new Set([
  "AWAITING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAYMENT_DETECTED",
  "PAYMENT_CONFIRMED",
  "SETTLEMENT_PENDING",
  "SETTLEMENT_IN_PROGRESS",
  "SETTLEMENT_SENT",
  "CONFIRMING",
]);

function secondsTo(deadline: string | null) {
  return deadline
    ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1_000))
    : 0;
}

function duration(start: string, end: string | null) {
  if (!end) return null;
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1_000),
  );
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="move-copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1_600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function PaymentQr({ value }: { value: string }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(value, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 232,
          color: { dark: "#171713", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (active) setSource(url);
      })
      .catch(() => {
        if (active) setSource(null);
      });
    return () => {
      active = false;
    };
  }, [value]);
  return source ? (
    // A locally generated data URL is intentional: payment details never leave the browser.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={source} alt="Payment QR code" className="move-payment-qr" />
  ) : (
    <div className="move-payment-qr move-payment-qr-loading" aria-label="Preparing QR code" />
  );
}

function PaymentInstructions({
  instruction,
  seconds,
}: {
  instruction: CustomerPaymentInstruction;
  seconds: number;
}) {
  const expired = seconds <= 0;
  return (
    <section className="move-payment-instructions" aria-labelledby="payment-instructions-title">
      <div className="move-section-heading">
        <div>
          <p className="move-eyebrow">Pay now</p>
          <h2 id="payment-instructions-title">
            {instruction.kind === "BLOCKCHAIN" ? "Send USDT" : "Make the INR payment"}
          </h2>
        </div>
        <span data-status={expired ? "EXPIRED" : "ACTIVE"} className="tnum">
          {expired ? "Expired" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        </span>
      </div>

      <div className="move-pay-exact">
        <span>Send exactly</span>
        <strong>{formatCurrencyAmount(instruction.amount, instruction.currency)}</strong>
        <small>Partial or rounded payments cannot be matched automatically.</small>
      </div>

      <div className="move-instruction-layout">
        <dl>
          {instruction.kind === "UPI" ? (
            <>
              <div><dt>Beneficiary</dt><dd>{instruction.beneficiary}</dd></div>
              <div><dt>UPI ID</dt><dd className="tnum">{instruction.upiId}</dd></div>
              <div><dt>Reference</dt><dd className="tnum">{instruction.orderReference}</dd></div>
            </>
          ) : instruction.kind === "BANK" ? (
            <>
              <div><dt>Beneficiary</dt><dd>{instruction.beneficiary}</dd></div>
              <div><dt>Bank</dt><dd>{instruction.bankName}</dd></div>
              <div><dt>Account number</dt><dd className="tnum">{instruction.accountNumber}</dd></div>
              <div><dt>IFSC</dt><dd className="tnum">{instruction.ifsc}</dd></div>
              <div><dt>Reference</dt><dd className="tnum">{instruction.orderReference}</dd></div>
            </>
          ) : (
            <>
              <div><dt>Network</dt><dd>{instruction.network}</dd></div>
              <div><dt>Address</dt><dd className="tnum move-break-value">{instruction.address}</dd></div>
              <div><dt>Reference</dt><dd className="tnum">{instruction.orderReference}</dd></div>
            </>
          )}
        </dl>
        {instruction.qrValue ? (
          <div className="move-instruction-qr">
            <PaymentQr value={instruction.qrValue} />
            <small>
              {instruction.kind === "UPI"
                ? "Scan with a UPI app"
                : `Scan as a ${instruction.network} address`}
            </small>
          </div>
        ) : null}
      </div>

      <div className="move-instruction-actions">
        <CopyButton value={instruction.copyText} label="Copy all" />
        {instruction.kind === "UPI" ? (
          <a href={instruction.paymentUri} className="move-primary-button">
            Open UPI app
          </a>
        ) : null}
      </div>
      {instruction.kind === "BLOCKCHAIN" ? (
        <p className="move-network-warning">
          Use {instruction.network} only. A different token or network may be unrecoverable.
        </p>
      ) : (
        <p className="move-network-warning">
          Use the exact amount and include the order reference if your bank allows a narration.
        </p>
      )}
    </section>
  );
}

export function OrderWorkspace({
  truth,
  initialState,
  instruction,
  instructionError,
}: {
  truth: OrderTruth;
  initialState: CustomerOrderState;
  instruction: CustomerPaymentInstruction | null;
  instructionError?: string | null;
}) {
  const [state, setState] = useState(initialState);
  const [seconds, setSeconds] = useState(() => secondsTo(initialState.paymentDeadline));
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(instructionError ?? null);
  const idempotencyKey = useRef(`payment:${crypto.randomUUID()}`);
  const currentStage = STATUS_STAGE[state.status] ?? -1;
  const isAttention = ["NEEDS_REVIEW", "DISPUTED", "FAILED"].includes(state.status);
  const isTerminal = ["COMPLETED", "CANCELLED", "EXPIRED", "FAILED"].includes(state.status);
  const completionDuration = duration(truth.createdAt, state.completedAt);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(truth.reference)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        order?: CustomerOrderState;
        error?: string;
      };
      if (response.ok && payload.order) {
        setState(payload.order);
        setSeconds(secondsTo(payload.order.paymentDeadline));
      }
    } catch {
      // Keep the last confirmed server state visible. The next poll retries.
    }
  }, [truth.reference]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(state.status)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [refresh, state.status]);

  useEffect(() => {
    if (state.status !== "AWAITING_PAYMENT" || !state.paymentDeadline) return;
    const timer = window.setInterval(() => {
      const remaining = secondsTo(state.paymentDeadline);
      setSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        void refresh();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [refresh, state.paymentDeadline, state.status]);

  const paymentReferenceKind = instruction?.kind === "BLOCKCHAIN" ? "txid" : "utr";
  const paymentReferenceLabel =
    paymentReferenceKind === "txid" ? "Transaction ID (TXID)" : "UTR (recommended)";
  const canSubmit = state.status === "AWAITING_PAYMENT" && seconds > 0 && Boolean(instruction);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(truth.reference)}/payment`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": idempotencyKey.current,
          },
          body: JSON.stringify({
            [paymentReferenceKind]: reference.trim() || undefined,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Payment submission could not be recorded.");
        await refresh();
        return;
      }
      await refresh();
    } catch {
      setError(
        "Connection lost. Retry safely with the same reference; duplicate payment references are blocked.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const visibleTxid = state.payment?.txid ?? state.settlement?.txid;

  return (
    <div className="move-order-layout">
      <section className="move-order-card" aria-labelledby="order-state-title">
        <div className="move-order-head">
          <div>
            <p className="move-eyebrow">{truth.reference}</p>
            <h1 id="order-state-title">{state.statusLabel}</h1>
          </div>
          <span className="move-live-indicator" data-terminal={isTerminal}>
            <i aria-hidden />
            {isTerminal ? "Final state" : "Live"}
          </span>
        </div>

        <div className="move-order-route">
          <div>
            <span>You send</span>
            <strong>{formatCurrencyAmount(truth.sendAmount, truth.sendCurrency)}</strong>
            <small>{truth.sourceMasked}</small>
          </div>
          <i aria-hidden>→</i>
          <div>
            <span>You receive</span>
            <strong>{formatCurrencyAmount(truth.receiveAmount, truth.receiveCurrency)}</strong>
            <small>{truth.destinationMasked}</small>
          </div>
        </div>

        <ol className="move-status-track" aria-label="Move progress">
          {STAGES.map((stage, index) => (
            <li
              key={stage.key}
              data-state={
                currentStage > index
                  ? "done"
                  : currentStage === index
                    ? "current"
                    : "upcoming"
              }
            >
              <span>{currentStage > index ? "✓" : index + 1}</span>
              <small>{stage.label}</small>
            </li>
          ))}
        </ol>

        <div className="sr-only" aria-live="polite">
          Order status: {state.statusLabel}
        </div>

        {state.status === "COMPLETED" ? (
          <section className="move-completed">
            <span aria-hidden>✓</span>
            <p className="move-eyebrow">Completed</p>
            <h2>
              {formatCurrencyAmount(truth.sendAmount, truth.sendCurrency)} →{" "}
              {formatCurrencyAmount(truth.receiveAmount, truth.receiveCurrency)}
            </h2>
            <p>
              {truth.destinationNetwork ? `${truth.destinationNetwork} · ` : ""}
              {truth.destinationMasked}
              {completionDuration ? ` · Completed in ${completionDuration}` : ""}
            </p>
            <div>
              <Link href="/" className="move-primary-button">Move again</Link>
              <Link href={`/orders/${truth.reference}/receipt`} className="move-secondary-button">
                Receipt
              </Link>
            </div>
          </section>
        ) : isAttention ? (
          <section className="move-attention-state">
            <p className="move-eyebrow">Needs attention</p>
            <h2>No further payment or settlement action is required from you right now.</h2>
            <p>
              Operations has paused this move for a controlled review. Existing payment and
              settlement references remain locked to this order.
            </p>
          </section>
        ) : state.status === "EXPIRED" ? (
          <section className="move-attention-state">
            <p className="move-eyebrow">Payment window expired</p>
            <h2>Do not pay these instructions.</h2>
            <p>No payment was signalled before expiry. Request a fresh quote to move again.</p>
            <Link href="/" className="move-primary-button">Request fresh quote</Link>
          </section>
        ) : state.status === "CANCELLED" ? (
          <section className="move-attention-state">
            <p className="move-eyebrow">Cancelled</p>
            <h2>This move is closed.</h2>
            <Link href="/" className="move-primary-button">Start a new move</Link>
          </section>
        ) : state.status === "AWAITING_PAYMENT" && instruction ? (
          <>
            <PaymentInstructions instruction={instruction} seconds={seconds} />
            <form onSubmit={submitPayment} className="move-payment-submit">
              <label>
                <span>{paymentReferenceLabel}</span>
                <input
                  className="input"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder={
                    paymentReferenceKind === "txid"
                      ? "Paste the network transaction ID"
                      : "Enter after paying, if available"
                  }
                  required={paymentReferenceKind === "txid"}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <button className="move-primary-button" disabled={!canSubmit || submitting}>
                {submitting ? "Recording…" : "I sent the payment"}
              </button>
              <p>
                This records your payment signal only. INRP2P marks payment confirmed only after
                provider, bank, or network verification.
              </p>
            </form>
          </>
        ) : (
          <section className="move-wait-state">
            <span className="move-wait-pulse" aria-hidden />
            <p className="move-eyebrow">{state.statusLabel}</p>
            <h2>
              {state.status === "PAYMENT_SUBMITTED"
                ? "Waiting for independent payment detection."
                : state.status === "PAYMENT_DETECTED"
                  ? "Payment detected. Confirmations are in progress."
                  : state.status === "PAYMENT_CONFIRMED"
                    ? "Payment confirmed. Settlement is being prepared."
                    : state.status === "SETTLEMENT_SENT" || state.status === "CONFIRMING"
                      ? "Settlement sent. Waiting for final confirmation."
                      : "Your move is processing."}
            </h2>
            <p>You can leave this page. The server state is retained and updates here automatically.</p>
          </section>
        )}

        {error ? <div className="move-inline-error" role="alert"><span aria-hidden>!</span><p>{error}</p><button type="button" onClick={() => setError(null)}>Close</button></div> : null}
      </section>

      <aside className="move-order-aside">
        <section className="move-panel">
          <p className="move-eyebrow">Final terms</p>
          <dl className="move-order-meta">
            <div><dt>Rate</dt><dd>₹{formatIndianNumber(truth.rate, 4)} / USDT</dd></div>
            <div><dt>Fee</dt><dd>{formatCurrencyAmount(truth.feeAmount, truth.feeCurrency)}</dd></div>
            <div><dt>Destination</dt><dd>{truth.destinationMasked}</dd></div>
            <div><dt>Order ID</dt><dd className="tnum">{truth.reference}</dd></div>
          </dl>
        </section>

        {(state.payment?.utrMasked || visibleTxid || state.settlement?.payoutReferenceMasked) ? (
          <section className="move-panel">
            <p className="move-eyebrow">Recorded references</p>
            <dl className="move-order-meta">
              {state.payment?.utrMasked ? <div><dt>UTR</dt><dd>{state.payment.utrMasked}</dd></div> : null}
              {visibleTxid ? <div><dt>TXID</dt><dd className="move-break-value">{visibleTxid}</dd></div> : null}
              {state.settlement?.payoutReferenceMasked ? <div><dt>Payout</dt><dd>{state.settlement.payoutReferenceMasked}</dd></div> : null}
            </dl>
          </section>
        ) : null}

        <p className="move-order-security">
          Never send funds to details received in chat. Use only the instructions bound to this
          order and never share a bank password, private key, or seed phrase.
        </p>
      </aside>
    </div>
  );
}
