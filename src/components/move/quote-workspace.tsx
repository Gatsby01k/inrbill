"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyAmount, formatIndianNumber, parseIndianAmount } from "@/lib/amount";

type Direction = "INR_TO_USDT" | "USDT_TO_INR";
type ExactSide = "SEND" | "RECEIVE";

type Quote = {
  id: string;
  direction: Direction;
  exactSide: ExactSide;
  sendCurrency: "INR" | "USDT";
  receiveCurrency: "INR" | "USDT";
  sendAmount: string;
  receiveAmount: string;
  rate: string;
  feeAmount: string;
  feeCurrency: "INR" | "USDT";
  etaMinutes: number | null;
  expiresAt: string;
};

export type RepeatMove = {
  reference: string;
  direction: Direction;
  sendAmount: string;
  receiveAmount: string;
  sourceMasked: string;
  destinationMasked: string;
};

export type SavedMoveMethod = {
  label: string;
  maskedLabel: string;
  status: string;
  type: string;
  purpose: string;
  isDefaultSend: boolean;
  isDefaultReceive: boolean;
};

type ActiveOrder = { reference: string; status: string } | null;

const INR_PRESETS = [
  { label: "₹10K", value: "10000" },
  { label: "₹25k", value: "25000" },
  { label: "₹50k", value: "50000" },
  { label: "₹1L", value: "100000" },
];
const USDT_PRESETS = [
  { label: "250", value: "250" },
  { label: "500", value: "500" },
  { label: "1,000", value: "1000" },
  { label: "2,500", value: "2500" },
];

function secondsRemaining(expiresAt?: string) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1_000));
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function methodStatusLabel(status?: string) {
  if (!status) return "Add after sign in";
  if (status === "OWNERSHIP_VERIFIED") return "Ownership verified";
  if (status === "FORMAT_VALIDATED") return "Address valid";
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING_VERIFICATION") return "Verification pending";
  return "Saved method";
}

function groupAmountInput(value: string, currency: "INR" | "USDT") {
  const parsed = parseIndianAmount(value, {
    decimals: currency === "INR" ? 2 : 6,
    maximum: currency === "INR" ? 100_000_000 : 1_000_000,
  });
  if (!parsed.ok) return value;
  return formatIndianNumber(parsed.value, currency === "INR" ? 2 : 6);
}

export function QuoteWorkspace({
  authenticated,
  maximumInr,
  maximumUsdt,
  repeatMove,
  activeOrder,
  initialNotice,
  recipientHandle,
  initialDirection = "INR_TO_USDT",
  fixedDirection = false,
  initialAmount = "100000",
  initialExactSide = "SEND",
  amountLocked = false,
  receiveToken,
  recipientLabel,
  savedMethods = [],
}: {
  authenticated: boolean;
  maximumInr?: string;
  maximumUsdt?: string;
  repeatMove: RepeatMove | null;
  activeOrder: ActiveOrder;
  initialNotice?: string;
  recipientHandle?: string;
  initialDirection?: Direction;
  fixedDirection?: boolean;
  initialAmount?: string;
  initialExactSide?: ExactSide;
  amountLocked?: boolean;
  receiveToken?: string;
  recipientLabel?: string;
  savedMethods?: SavedMoveMethod[];
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [exactSide, setExactSide] = useState<ExactSide>(initialExactSide);
  const [amount, setAmount] = useState(() =>
    groupAmountInput(
      initialAmount,
      initialExactSide === "SEND"
        ? initialDirection === "INR_TO_USDT"
          ? "INR"
          : "USDT"
        : initialDirection === "INR_TO_USDT"
          ? "USDT"
          : "INR",
    ),
  );
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(initialNotice ?? null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [repeatReference, setRepeatReference] = useState<string | null>(null);
  const requestNumber = useRef(0);
  const quoteAbort = useRef<AbortController | null>(null);

  const sendCurrency = direction === "INR_TO_USDT" ? "INR" : "USDT";
  const receiveCurrency = direction === "INR_TO_USDT" ? "USDT" : "INR";
  const inputCurrency = exactSide === "SEND" ? sendCurrency : receiveCurrency;
  const maximum = inputCurrency === "INR" ? maximumInr : maximumUsdt;
  const presets = inputCurrency === "INR" ? INR_PRESETS : USDT_PRESETS;
  const sourceMethod = useMemo(() => {
    const acceptedTypes =
      direction === "INR_TO_USDT"
        ? new Set(["UPI_HANDLE", "BANK_ACCOUNT"])
        : new Set(["USDT_WALLET"]);
    return (
      savedMethods.find(
        (method) =>
          acceptedTypes.has(method.type) &&
          (method.purpose === "SEND" || method.purpose === "BOTH") &&
          method.isDefaultSend,
      ) ??
      savedMethods.find(
        (method) =>
          acceptedTypes.has(method.type) &&
          (method.purpose === "SEND" || method.purpose === "BOTH"),
      )
    );
  }, [direction, savedMethods]);
  const destinationMethod = useMemo(() => {
    const acceptedTypes =
      direction === "INR_TO_USDT"
        ? new Set(["USDT_WALLET"])
        : new Set(["UPI_HANDLE", "BANK_ACCOUNT"]);
    return (
      savedMethods.find(
        (method) =>
          acceptedTypes.has(method.type) &&
          (method.purpose === "RECEIVE" || method.purpose === "BOTH") &&
          method.isDefaultReceive,
      ) ??
      savedMethods.find(
        (method) =>
          acceptedTypes.has(method.type) &&
          (method.purpose === "RECEIVE" || method.purpose === "BOTH"),
      )
    );
  }, [direction, savedMethods]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("inrp2p-move-draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as {
        amount?: string;
        direction?: Direction;
        exactSide?: ExactSide;
      };
      if (!amountLocked && draft.amount) {
        const draftCurrency =
          (draft.exactSide ?? initialExactSide) === "SEND"
            ? (draft.direction ?? initialDirection) === "INR_TO_USDT"
              ? "INR"
              : "USDT"
            : (draft.direction ?? initialDirection) === "INR_TO_USDT"
              ? "USDT"
              : "INR";
        setAmount(groupAmountInput(draft.amount, draftCurrency));
      }
      if (
        !fixedDirection &&
        (draft.direction === "INR_TO_USDT" || draft.direction === "USDT_TO_INR")
      ) {
        setDirection(draft.direction);
      }
      if (
        !amountLocked &&
        (draft.exactSide === "SEND" || draft.exactSide === "RECEIVE")
      ) {
        setExactSide(draft.exactSide);
      }
    } catch {
      window.sessionStorage.removeItem("inrp2p-move-draft");
    }
  }, [amountLocked, fixedDirection, initialDirection, initialExactSide]);

  useEffect(() => {
    if (amountLocked) return;
    window.sessionStorage.setItem(
      "inrp2p-move-draft",
      JSON.stringify({ amount, direction, exactSide }),
    );
  }, [amount, amountLocked, direction, exactSide]);

  const parsed = useMemo(
    () =>
      parseIndianAmount(amount, {
        max: maximum,
        decimals: inputCurrency === "INR" ? 2 : 6,
        maximum: inputCurrency === "INR" ? 100_000_000 : 1_000_000,
      }),
    [amount, inputCurrency, maximum],
  );

  const requestQuote = useCallback(async () => {
    if (!parsed.ok) {
      setQuote(null);
      if (parsed.reason === "max-unavailable") {
        setError("Your verified limit is not available yet.");
      } else if (parsed.reason !== "empty") {
        setError("Enter a valid amount.");
      }
      return;
    }

    const current = ++requestNumber.current;
    quoteAbort.current?.abort();
    const controller = new AbortController();
    quoteAbort.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          direction,
          exactSide,
          amount: parsed.value,
          recipientHandle,
          receiveToken,
          repeatOrderReference: repeatReference ?? undefined,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as { quote?: Quote; error?: string };
      if (current !== requestNumber.current) return;
      if (!response.ok || !payload.quote) {
        setQuote(null);
        setError(payload.error ?? "A live quote is unavailable.");
        return;
      }
      setQuote(payload.quote);
      setSeconds(secondsRemaining(payload.quote.expiresAt));
    } catch (requestError) {
      if (current !== requestNumber.current) return;
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setQuote(null);
      setError("Could not reach pricing. Check your connection and retry.");
    } finally {
      if (current === requestNumber.current) setLoading(false);
      if (quoteAbort.current === controller) quoteAbort.current = null;
    }
  }, [direction, exactSide, parsed, receiveToken, recipientHandle, repeatReference]);

  useEffect(
    () => () => {
      quoteAbort.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void requestQuote();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [requestQuote]);

  useEffect(() => {
    if (!quote) return;
    const timer = window.setInterval(() => {
      const remaining = secondsRemaining(quote.expiresAt);
      setSeconds(remaining);
      if (remaining === 0) {
        setQuote(null);
        window.clearInterval(timer);
        void requestQuote();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [quote, requestQuote]);

  function swap() {
    if (fixedDirection) return;
    if (quote) {
      const nextInputCurrency =
        exactSide === "SEND" ? quote.receiveCurrency : quote.sendCurrency;
      const nextAmount = exactSide === "SEND" ? quote.receiveAmount : quote.sendAmount;
      setAmount(groupAmountInput(nextAmount, nextInputCurrency));
    }
    setDirection((current) =>
      current === "INR_TO_USDT" ? "USDT_TO_INR" : "INR_TO_USDT",
    );
    setRepeatReference(null);
    setQuote(null);
  }

  function repeat() {
    if (!repeatMove) return;
    setDirection(repeatMove.direction);
    setExactSide("SEND");
    setAmount(
      groupAmountInput(
        repeatMove.sendAmount,
        repeatMove.direction === "INR_TO_USDT" ? "INR" : "USDT",
      ),
    );
    setRepeatReference(repeatMove.reference);
    setQuote(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueMove() {
    if (!quote || secondsRemaining(quote.expiresAt) === 0) {
      void requestQuote();
      return;
    }
    const destination = authenticated
      ? `/move/${encodeURIComponent(quote.id)}`
      : `/auth/customer?quote=${encodeURIComponent(quote.id)}`;
    router.push(destination);
  }

  const computedResult = quote
    ? exactSide === "SEND"
      ? formatCurrencyAmount(quote.receiveAmount, quote.receiveCurrency)
      : formatCurrencyAmount(quote.sendAmount, quote.sendCurrency)
    : "—";
  const expiryLabel = quote
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : "—";
  const sourceLabel = sourceMethod?.maskedLabel ?? (authenticated ? "Add payment source" : "Choose after sign in");
  const destinationLabel =
    destinationMethod?.maskedLabel ?? (authenticated ? "Add receive destination" : "Choose after sign in");
  const amountEditor = (
    <div className="move-money-entry">
      <label className="move-amount-field">
        <span>{exactSide === "SEND" ? "You send" : "You receive exactly"}</span>
        <div>
          <b aria-hidden>{inputCurrency === "INR" ? "₹" : ""}</b>
          <input
            value={amount}
            onChange={(event) => {
              if (!amountLocked) {
                setAmount(event.target.value);
                setRepeatReference(null);
              }
            }}
            onBlur={() => {
              if (!amountLocked) setAmount((current) => groupAmountInput(current, inputCurrency));
            }}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            spellCheck={false}
            aria-describedby="amount-help"
            aria-invalid={!parsed.ok && amount.length > 0}
            readOnly={amountLocked}
          />
          <em>{inputCurrency}</em>
        </div>
        <small id="amount-help">
          {amountLocked
            ? "This payment request fixes the receive amount."
            : "Understands 50k, 1l, 2.5 lakh, 1cr and max."}
        </small>
      </label>

      {!amountLocked ? (
        <div className="move-presets" aria-label="Quick amounts">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setAmount(groupAmountInput(preset.value, inputCurrency))}
            >
              {preset.label}
            </button>
          ))}
          {maximum ? (
            <button type="button" onClick={() => setAmount("max")}>
              Max
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="move-workspace" id="move-quote">
      <header className="move-product-heading">
        <div>
          <p className="move-eyebrow">
            {recipientHandle ? `Pay ${recipientHandle}@inrp2p` : recipientLabel ?? "One clear transaction"}
          </p>
          <h1 id="move-title">Move INR <span aria-hidden>↔</span> USDT</h1>
          <p>One quote. One payment. One tracked result.</p>
        </div>
        <span className="move-product-trust">
          <i aria-hidden />
          Server-priced
        </span>
      </header>

      <div className="move-home-grid">
        <section className="move-quote-card" aria-labelledby="move-title">
          <div className="move-card-head">
            <p className="move-eyebrow">Set your amount</p>
            <span className="move-server-truth">
              <i aria-hidden />
              Live quote
            </span>
          </div>

          <div className="move-exact-toggle" aria-label="Amount mode">
            <button
              type="button"
              className={exactSide === "SEND" ? "is-active" : ""}
              onClick={() => {
                if (!amountLocked) {
                  setExactSide("SEND");
                  if (quote) {
                    setAmount(groupAmountInput(quote.sendAmount, quote.sendCurrency));
                  }
                  setRepeatReference(null);
                }
              }}
              aria-pressed={exactSide === "SEND"}
              disabled={amountLocked}
            >
              I send exactly
            </button>
            <button
              type="button"
              className={exactSide === "RECEIVE" ? "is-active" : ""}
              onClick={() => {
                if (!amountLocked) {
                  setExactSide("RECEIVE");
                  if (quote) {
                    setAmount(groupAmountInput(quote.receiveAmount, quote.receiveCurrency));
                  }
                  setRepeatReference(null);
                }
              }}
              aria-pressed={exactSide === "RECEIVE"}
              disabled={amountLocked}
            >
              I receive exactly
            </button>
          </div>

          <div className="move-money-stack">
            <div
              className={`move-money-row ${
                exactSide === "SEND" ? "move-money-row-input" : "move-money-row-result"
              }`}
            >
              <div className="move-currency-choice">
                <span>From</span>
                <strong><i aria-hidden>{sendCurrency === "INR" ? "🇮🇳" : "₮"}</i>{sendCurrency}</strong>
              </div>
              {exactSide === "SEND" ? (
                amountEditor
              ) : (
                <div className="move-result" aria-live="polite" aria-busy={loading}>
                  <span>You send</span>
                  <strong className={loading ? "is-loading" : ""}>{computedResult}</strong>
                </div>
              )}
            </div>

            <div className="move-swap-line" aria-hidden={fixedDirection}>
              <span />
              <button
                type="button"
                onClick={swap}
                aria-label={fixedDirection ? "Currency direction is set by the recipient" : "Swap currencies"}
                disabled={fixedDirection}
              >
                <span aria-hidden>⇅</span>
              </button>
              <span />
            </div>

            <div
              className={`move-money-row ${
                exactSide === "RECEIVE" ? "move-money-row-input" : "move-money-row-result"
              }`}
            >
              <div className="move-currency-choice">
                <span>To</span>
                <strong><i aria-hidden>{receiveCurrency === "INR" ? "🇮🇳" : "₮"}</i>{receiveCurrency}</strong>
              </div>
              {exactSide === "RECEIVE" ? (
                amountEditor
              ) : (
                <div className="move-result" aria-live="polite" aria-busy={loading}>
                  <span>You receive</span>
                  <strong className={loading ? "is-loading" : ""}>{computedResult}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="move-saved-route">
            <div>
              <span className="move-route-icon" data-kind={sendCurrency}>{sendCurrency === "INR" ? "₹" : "₮"}</span>
              <p><small>Pay with</small><strong>{sourceLabel}</strong></p>
              <em>{methodStatusLabel(sourceMethod?.status)}</em>
            </div>
            <div>
              <span className="move-route-icon" data-kind={receiveCurrency}>{receiveCurrency === "INR" ? "₹" : "₮"}</span>
              <p><small>Receive to</small><strong>{destinationLabel}</strong></p>
              <em>{methodStatusLabel(destinationMethod?.status)}</em>
            </div>
          </div>

          {error ? (
            <div className="move-inline-error" role="status">
              <span aria-hidden>!</span>
              <p>{error}</p>
              <button type="button" onClick={() => void requestQuote()}>
                Retry
              </button>
            </div>
          ) : null}
        </section>

        <aside className="move-home-aside">
          <section className="move-final-quote" aria-label="Final quote">
            <p className="move-final-kicker">Final quote</p>
            <span>You receive</span>
            <strong className={loading ? "is-loading" : ""}>
              {quote ? formatCurrencyAmount(quote.receiveAmount, quote.receiveCurrency) : "—"}
            </strong>
            <dl>
              <div><dt>Rate</dt><dd>{quote ? `₹${formatIndianNumber(quote.rate, 4)}` : "—"}</dd></div>
              <div><dt>Fee</dt><dd>{quote ? formatCurrencyAmount(quote.feeAmount, quote.feeCurrency) : "—"}</dd></div>
              <div><dt>Estimated</dt><dd>{quote?.etaMinutes ? `${quote.etaMinutes} min` : "—"}</dd></div>
              <div><dt>Destination</dt><dd>{destinationMethod?.maskedLabel ?? receiveCurrency}</dd></div>
              <div><dt>Quote expires</dt><dd className="tnum move-expiry">{expiryLabel}</dd></div>
            </dl>
            <button
              type="button"
              className="move-primary-button move-continue"
              onClick={continueMove}
              disabled={!quote || loading}
            >
              {loading ? "Updating quote…" : authenticated ? "Continue to confirm" : "Continue securely"}
              <span aria-hidden>→</span>
            </button>
            <p>A fresh quote is checked again before confirmation.</p>
          </section>

          {activeOrder ? (
            <button
              type="button"
              className="move-active-order"
              onClick={() => router.push(`/orders/${activeOrder.reference}`)}
            >
              <span>Active move</span>
              <strong>{activeOrder.reference}</strong>
              <small>
                {statusLabel(activeOrder.status)} <b aria-hidden>→</b>
              </small>
            </button>
          ) : null}

          {repeatMove ? (
            <div className="move-repeat-card">
              <div className="move-repeat-head">
                <span>Repeat last move?</span>
                <small>Fresh quote required</small>
              </div>
              <strong>
                {formatCurrencyAmount(
                  repeatMove.sendAmount,
                  repeatMove.direction === "INR_TO_USDT" ? "INR" : "USDT",
                )}{" "}
                <span aria-hidden>→</span>{" "}
                {formatCurrencyAmount(
                  repeatMove.receiveAmount,
                  repeatMove.direction === "INR_TO_USDT" ? "USDT" : "INR",
                )}
              </strong>
              <p>
                {repeatMove.sourceMasked}
                <span aria-hidden>→</span>
                {repeatMove.destinationMasked}
              </p>
              <button type="button" onClick={repeat}>
                Get fresh quote <span aria-hidden>↗</span>
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <ol className="move-flow-stepper" aria-label="Transaction steps">
        {["Quote", "Details", "Confirm", "Pay", "Complete"].map((label, index) => (
          <li key={label} data-current={index === 0}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      <p className="move-no-fabrication">
        If executable pricing or capacity is unavailable, INRP2P shows that state instead of
        inventing an estimate.
      </p>
    </div>
  );
}
