"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyAmount, formatIndianNumber } from "@/lib/amount";

export type MoveMethodOption = {
  id: string;
  label: string;
  maskedLabel: string;
  status: string;
  type: string;
};

type QuoteSummary = {
  id: string;
  sendAmount: string;
  sendCurrency: "INR" | "USDT";
  receiveAmount: string;
  receiveCurrency: "INR" | "USDT";
  rate: string;
  feeAmount: string;
  feeCurrency: "INR" | "USDT";
  expiresAt: string;
};

const HOLD_MS = 1_100;

function methodStatus(status: string) {
  if (status === "OWNERSHIP_VERIFIED") return "Ownership verified";
  if (status === "FORMAT_VALIDATED") return "Address format validated";
  if (status === "UNVERIFIED") return "Saved · not verified";
  return status.toLowerCase().replaceAll("_", " ");
}

export function MoveConfirmation({
  quote,
  sourceMethods,
  destinationMethods,
  sourceHintId,
  destinationHintId,
  recipientDestination,
  complianceReady,
}: {
  quote: QuoteSummary;
  sourceMethods: MoveMethodOption[];
  destinationMethods: MoveMethodOption[];
  sourceHintId?: string | null;
  destinationHintId?: string | null;
  recipientDestination?: MoveMethodOption | null;
  complianceReady: boolean;
}) {
  const router = useRouter();
  const initialSource =
    sourceMethods.find((method) => method.id === sourceHintId)?.id ?? sourceMethods[0]?.id ?? "";
  const initialDestination =
    recipientDestination?.id ??
    destinationMethods.find((method) => method.id === destinationHintId)?.id ??
    destinationMethods[0]?.id ??
    "";
  const [sourceId, setSourceId] = useState(initialSource);
  const [destinationId, setDestinationId] = useState(initialDestination);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preflightReady, setPreflightReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1_000)),
  );
  const holdRun = useRef(0);
  const holdingRef = useRef(false);
  const readyRef = useRef(false);
  const creatingRef = useRef(false);
  const idempotencyKey = useRef(`move:${crypto.randomUUID()}`);

  const selectedSource = useMemo(
    () => sourceMethods.find((method) => method.id === sourceId),
    [sourceId, sourceMethods],
  );
  const selectedDestination = useMemo(
    () =>
      recipientDestination ??
      destinationMethods.find((method) => method.id === destinationId),
    [destinationId, destinationMethods, recipientDestination],
  );
  const canHold =
    complianceReady && Boolean(selectedSource) && Boolean(selectedDestination) && seconds > 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1_000),
      );
      setSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [quote.expiresAt, router]);

  async function createOrder(run: number) {
    if (run !== holdRun.current || creatingRef.current) return;
    creatingRef.current = true;
    holdingRef.current = false;
    setCreating(true);
    setProgress(100);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current,
        },
        body: JSON.stringify({
          quoteId: quote.id,
          sourcePaymentMethodId: sourceId,
          destinationPaymentMethodId: recipientDestination ? undefined : destinationId,
        }),
      });
      const payload = (await response.json()) as {
        order?: { reference: string };
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.order) {
        setError(payload.error ?? "The move could not be created.");
        setCreating(false);
        creatingRef.current = false;
        setHolding(false);
        setProgress(0);
        if (payload.code === "QUOTE_EXPIRED") router.refresh();
        return;
      }
      router.push(`/orders/${encodeURIComponent(payload.order.reference)}`);
    } catch {
      setError("Connection lost before confirmation. Retry safely; duplicate orders are blocked.");
      setCreating(false);
      creatingRef.current = false;
      setHolding(false);
      setProgress(0);
    }
  }

  async function runPreflight(run: number) {
    try {
      const response = await fetch("/api/orders/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          sourcePaymentMethodId: sourceId,
          destinationPaymentMethodId: recipientDestination ? undefined : destinationId,
        }),
      });
      const payload = (await response.json()) as {
        ready?: boolean;
        error?: string;
        checks?: Record<string, boolean>;
      };
      if (run !== holdRun.current) return;
      if (!response.ok || !payload.ready) {
        holdingRef.current = false;
        setHolding(false);
        setProgress(0);
        setError(payload.error ?? "Checks could not complete.");
        return;
      }
      readyRef.current = true;
      setPreflightReady(true);
    } catch {
      if (run !== holdRun.current) return;
      holdingRef.current = false;
      setHolding(false);
      setProgress(0);
      setError("Checks could not reach the server.");
    }
  }

  function beginHold() {
    if (!canHold || creatingRef.current || holdingRef.current) return;
    const run = ++holdRun.current;
    holdingRef.current = true;
    readyRef.current = false;
    setError(null);
    setPreflightReady(false);
    setProgress(0);
    setHolding(true);
    const startedAt = performance.now();
    void runPreflight(run);

    const tick = (now: number) => {
      if (run !== holdRun.current || !holdingRef.current) return;
      const elapsed = now - startedAt;
      const nextProgress = Math.min(readyRef.current ? 100 : 92, (elapsed / HOLD_MS) * 100);
      setProgress(nextProgress);
      if (elapsed >= HOLD_MS && readyRef.current) {
        void createOrder(run);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function cancelHold() {
    if (creatingRef.current) return;
    holdingRef.current = false;
    holdRun.current += 1;
    setHolding(false);
    setPreflightReady(false);
    setProgress(0);
  }

  const holdLabel = creating
    ? "Creating secure order…"
    : holding
      ? !preflightReady
        ? "Checking quote…"
        : progress < 55
          ? "Limits checked"
          : progress < 86
            ? "Availability confirmed"
            : "Ready"
      : !complianceReady
        ? "Verification required"
        : !selectedSource || !selectedDestination
          ? "Add required methods"
          : "Hold to move";

  return (
    <section className="move-confirm-panel">
      <div className="move-confirm-methods">
        <fieldset>
          <legend>You send from</legend>
          {sourceMethods.length ? (
            <div className="move-method-options">
              {sourceMethods.map((method) => (
                <label key={method.id}>
                  <input
                    type="radio"
                    name="sourceMethod"
                    value={method.id}
                    checked={sourceId === method.id}
                    onChange={() => setSourceId(method.id)}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <small>{method.maskedLabel}</small>
                  </span>
                  <em>{methodStatus(method.status)}</em>
                </label>
              ))}
            </div>
          ) : (
            <p className="move-method-empty">Add a compatible payment source below.</p>
          )}
        </fieldset>

        <fieldset>
          <legend>You receive to</legend>
          {recipientDestination ? (
            <div className="move-recipient-method">
              <span>
                <strong>{recipientDestination.label}</strong>
                <small>{recipientDestination.maskedLabel}</small>
              </span>
              <em>Recipient profile</em>
            </div>
          ) : destinationMethods.length ? (
            <div className="move-method-options">
              {destinationMethods.map((method) => (
                <label key={method.id}>
                  <input
                    type="radio"
                    name="destinationMethod"
                    value={method.id}
                    checked={destinationId === method.id}
                    onChange={() => setDestinationId(method.id)}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <small>{method.maskedLabel}</small>
                  </span>
                  <em>{methodStatus(method.status)}</em>
                </label>
              ))}
            </div>
          ) : (
            <p className="move-method-empty">Add a compatible receive destination below.</p>
          )}
        </fieldset>
      </div>

      <div className="move-final-summary">
        <div>
          <span>You send</span>
          <strong>{formatCurrencyAmount(quote.sendAmount, quote.sendCurrency)}</strong>
          <small>from {selectedSource?.maskedLabel ?? "payment source required"}</small>
        </div>
        <i aria-hidden>→</i>
        <div>
          <span>You receive</span>
          <strong>{formatCurrencyAmount(quote.receiveAmount, quote.receiveCurrency)}</strong>
          <small>to {selectedDestination?.maskedLabel ?? "destination required"}</small>
        </div>
      </div>

      <dl className="move-confirm-meta">
        <div>
          <dt>Rate</dt>
          <dd>₹{formatIndianNumber(quote.rate, 4)} / USDT</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd>{formatCurrencyAmount(quote.feeAmount, quote.feeCurrency)}</dd>
        </div>
        <div>
          <dt>Quote</dt>
          <dd>{seconds}s</dd>
        </div>
      </dl>

      {error ? (
        <div className="move-inline-error" role="alert">
          <span aria-hidden>!</span>
          <p>{error}</p>
          <button type="button" onClick={() => setError(null)}>
            Close
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="move-hold-button"
        disabled={!canHold || creating}
        aria-pressed={holding}
        aria-describedby="hold-help"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          beginHold();
        }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            beginHold();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            cancelHold();
          }
        }}
      >
        <span className="move-hold-fill" style={{ width: `${progress}%` }} aria-hidden />
        <span className="move-hold-label">{holdLabel}</span>
      </button>
      <div
        className="sr-only"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        {holdLabel}
      </div>
      <p id="hold-help" className="move-hold-help">
        Hold for one second. Releasing early cancels; desktop never requires dragging.
      </p>
    </section>
  );
}
