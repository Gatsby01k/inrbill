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

type ActiveOrder = { reference: string; status: string } | null;

const INR_PRESETS = [
  { label: "₹25k", value: "25000" },
  { label: "₹50k", value: "50000" },
  { label: "₹1 lakh", value: "100000" },
  { label: "₹5 lakh", value: "500000" },
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
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [exactSide, setExactSide] = useState<ExactSide>(initialExactSide);
  const [amount, setAmount] = useState(initialAmount);
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

  useEffect(() => {
    const saved = window.sessionStorage.getItem("inrp2p-move-draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as {
        amount?: string;
        direction?: Direction;
        exactSide?: ExactSide;
      };
      if (!amountLocked && draft.amount) setAmount(draft.amount);
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
  }, [amountLocked, fixedDirection]);

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
    setAmount(repeatMove.sendAmount);
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

  const primaryResult = quote
    ? exactSide === "SEND"
      ? formatCurrencyAmount(quote.receiveAmount, quote.receiveCurrency)
      : formatCurrencyAmount(quote.sendAmount, quote.sendCurrency)
    : "—";

  return (
    <div className="move-home-grid">
      <section className="move-quote-card" aria-labelledby="move-title">
        <div className="move-card-head">
          <div>
            <p className="move-eyebrow">{recipientHandle ? `Pay ${recipientHandle}@inrp2p` : recipientLabel ?? "New move"}</p>
            <h1 id="move-title">Move INR and USDT.</h1>
          </div>
          <span className="move-server-truth">
            <i aria-hidden />
            Server quote
          </span>
        </div>

        <div className="move-direction">
          <div>
            <span>From</span>
            <strong>{sendCurrency}</strong>
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label={fixedDirection ? "Currency direction is set by the recipient" : "Swap currencies"}
            disabled={fixedDirection}
          >
            <span aria-hidden>⇄</span>
          </button>
          <div>
            <span>To</span>
            <strong>{receiveCurrency}</strong>
          </div>
        </div>

        <div className="move-exact-toggle" aria-label="Amount mode">
          <button
            type="button"
            className={exactSide === "SEND" ? "is-active" : ""}
            onClick={() => {
              if (!amountLocked) setExactSide("SEND");
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
              if (!amountLocked) setExactSide("RECEIVE");
            }}
            aria-pressed={exactSide === "RECEIVE"}
            disabled={amountLocked}
          >
            I receive exactly
          </button>
        </div>

        <label className="move-amount-field">
          <span>{exactSide === "SEND" ? "Amount you send" : "Amount you receive"}</span>
          <div>
            <b aria-hidden>{inputCurrency === "INR" ? "₹" : "₮"}</b>
            <input
              value={amount}
              onChange={(event) => {
                if (!amountLocked) {
                  setAmount(event.target.value);
                  setRepeatReference(null);
                }
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
              : "Try 50k, 1l, 2.5 lakh, 1cr or max."}
          </small>
        </label>

        {!amountLocked ? <div className="move-presets" aria-label="Quick amounts">
          {presets.map((preset) => (
            <button key={preset.value} type="button" onClick={() => setAmount(preset.value)}>
              {preset.label}
            </button>
          ))}
          {maximum ? (
            <button type="button" onClick={() => setAmount("max")}>
              Max
            </button>
          ) : null}
        </div> : null}

        <div className="move-result" aria-live="polite" aria-busy={loading}>
          <span>{exactSide === "SEND" ? "You receive" : "You send"}</span>
          <strong className={loading ? "is-loading" : ""}>{primaryResult}</strong>
        </div>

        <dl className="move-quote-meta">
          <div>
            <dt>Rate</dt>
            <dd>{quote ? `₹${formatIndianNumber(quote.rate, 4)} / USDT` : "—"}</dd>
          </div>
          <div>
            <dt>Fee</dt>
            <dd>{quote ? formatCurrencyAmount(quote.feeAmount, quote.feeCurrency) : "—"}</dd>
          </div>
          <div>
            <dt>ETA</dt>
            <dd>{quote?.etaMinutes ? `~${quote.etaMinutes} min` : "Not quoted"}</dd>
          </div>
          <div>
            <dt>Quote expiry</dt>
            <dd className="tnum">{quote ? `${seconds}s` : "—"}</dd>
          </div>
        </dl>

        {error ? (
          <div className="move-inline-error" role="status">
            <span aria-hidden>!</span>
            <p>{error}</p>
            <button type="button" onClick={() => void requestQuote()}>
              Retry
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="move-primary-button move-continue"
          onClick={continueMove}
          disabled={!quote || loading}
        >
          {loading ? "Updating quote…" : authenticated ? "Continue" : "Continue securely"}
          <span aria-hidden>→</span>
        </button>
        <p className="move-quote-foot">
          Authentication comes next. Rate, fee, destination and final amount stay visible before
          confirmation.
        </p>
      </section>

      <aside className="move-home-aside">
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
            <strong>{formatCurrencyAmount(repeatMove.sendAmount, repeatMove.direction === "INR_TO_USDT" ? "INR" : "USDT")}</strong>
            <p>
              {repeatMove.sourceMasked}
              <span aria-hidden>→</span>
              {repeatMove.destinationMasked}
            </p>
            <button type="button" onClick={repeat}>
              Repeat <span aria-hidden>↗</span>
            </button>
          </div>
        ) : null}

        <div className="move-clarity-card">
          <p className="move-eyebrow">What happens next</p>
          <ol>
            <li>
              <span>1</span>
              <p>
                <strong>Confirm identity</strong>
                <small>Only after the quote.</small>
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>Add required details</strong>
                <small>Payment source and destination only.</small>
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>Hold to move</strong>
                <small>Limits and capacity are checked again.</small>
              </p>
            </li>
          </ol>
        </div>
        <p className="move-no-fabrication">
          If executable pricing or liquidity is unavailable, INRP2P shows that state instead of an
          estimate.
        </p>
      </aside>
    </div>
  );
}
