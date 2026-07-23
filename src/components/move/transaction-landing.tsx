import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { Reveal } from "@/components/motion";

const customerJourney = [
  {
    number: "01",
    title: "See the final result",
    body: "Enter INR or USDT in the format you naturally use. The server returns the rate, fee, ETA and exact receive amount before sign-in.",
  },
  {
    number: "02",
    title: "Continue without starting over",
    body: "The pending quote survives authentication. Returning customers keep their saved methods and go straight to confirmation.",
  },
  {
    number: "03",
    title: "Add only what this move needs",
    body: "One payment source, one destination and only the compliance checks required for the selected direction and amount.",
  },
  {
    number: "04",
    title: "Pay from bound instructions",
    body: "UPI, IMPS, bank or USDT instructions are created for one order, with an expiry, exact amount and unique reference.",
  },
  {
    number: "05",
    title: "Track one truthful state",
    body: "Payment detection, settlement, confirmations and completion are driven by backend evidence—not by a screenshot or optimistic button.",
  },
] as const;

const customerTruth = [
  "Final amount before payment",
  "Masked source and destination",
  "Rate, fee, ETA and expiry",
  "Live transaction status",
  "Receipt with payment references",
] as const;

const operatingControls = [
  ["Quote", "Server-priced and short-lived"],
  ["Payment", "Matched independently where supported"],
  ["Settlement", "Idempotent and double-payment protected"],
  ["Reassignment", "Frozen, checked and fully audited"],
  ["Completion", "Requires confirmed backend evidence"],
] as const;

const directions = [
  {
    code: "INR",
    title: "INR → USDT",
    body: "Pay through an eligible INR source and receive USDT to a network-validated wallet address.",
    details: ["UPI / IMPS / bank", "TRC20 / ERC20 / Polygon", "Exact destination shown"],
  },
  {
    code: "USDT",
    title: "USDT → INR",
    body: "Send USDT on the selected network and receive INR to a saved UPI or verified bank destination.",
    details: ["Network-bound deposit", "UPI / IMPS / bank", "One tracked receipt"],
  },
] as const;

function Arrow() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.9 8.1 7 10 4.1-1.9 7-5.5 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 10h5v5h-5a2.5 2.5 0 0 1 0-5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 8a8 8 0 0 0-13.5-2L4 8M5 16a8 8 0 0 0 13.5 2l1.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4v4h4M20 20v-4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13v-2a7 7 0 0 1 14 0v2M5 13H3v5h3M19 13h2v5h-3c0 1.7-1.3 3-3 3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const capabilityStrip = [
  [ShieldIcon, "Final quote before payment"],
  [WalletIcon, "Address & network validation"],
  [SyncIcon, "Tracked transaction states"],
  [ReceiptIcon, "Receipt & audit trail"],
  [SupportIcon, "Support when needed"],
] as const;

export function TransactionLanding() {
  return (
    <div className="move-story">
      <section className="move-capability-strip" aria-label="Transaction protections">
        {capabilityStrip.map(([Icon, label]) => (
          <div key={label}>
            <Icon />
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="move-story-intro">
        <Reveal className="move-story-heading">
          <p className="move-story-kicker"><span /> The complete move</p>
          <h2>As simple as a payment.<br /><em>As strict as settlement operations.</em></h2>
        </Reveal>
        <Reveal index={1} className="move-story-lede">
          <p>
            INRP2P is not a public order book and never asks you to choose a trader.
            You choose the direction and amount. The system handles the controlled
            transaction lifecycle behind one clear result.
          </p>
          <a href="#move-quote">Start with an amount <Arrow /></a>
        </Reveal>
      </section>

      <section className="move-journey-section" aria-labelledby="journey-title">
        <div className="move-story-section-head">
          <p>01 / Customer journey</p>
          <h2 id="journey-title">No dashboard before intent.<br />No repeated setup.</h2>
        </div>
        <div className="move-journey-grid">
          {customerJourney.map((item, index) => (
            <Reveal key={item.number} index={index} className="move-journey-card">
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="move-control-story" aria-labelledby="control-title">
        <div className="move-control-copy">
          <p className="move-story-kicker move-story-kicker-dark"><span /> Financial truth</p>
          <h2 id="control-title">You see one move.<br /><em>The system proves every step.</em></h2>
          <p>
            Customer language stays simple. Financial calculations, authorization,
            capacity reservation and status transitions remain server-enforced.
          </p>
          <ul>
            {customerTruth.map((item) => <li key={item}><span>✓</span>{item}</li>)}
          </ul>
        </div>
        <div className="move-control-ledger">
          <div className="move-control-ledger-head">
            <span>Control</span>
            <span>Enforcement</span>
          </div>
          {operatingControls.map(([label, value], index) => (
            <Reveal key={label} index={index} className="move-control-ledger-row">
              <span><i>0{index + 1}</i>{label}</span>
              <strong>{value}</strong>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="move-directions" aria-labelledby="directions-title">
        <div className="move-story-section-head">
          <p>02 / Two directions</p>
          <h2 id="directions-title">One interface.<br />The route changes, not the product.</h2>
        </div>
        <div className="move-direction-cards">
          {directions.map((direction, index) => (
            <Reveal key={direction.title} index={index} className="move-direction-card">
              <div className="move-direction-card-code">
                <BrandMark size={28} />
                <span>{direction.code}</span>
              </div>
              <h3>{direction.title}</h3>
              <p>{direction.body}</p>
              <ul>
                {direction.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="move-story-final">
        <div aria-hidden className="move-story-final-mark"><BrandMark size={76} /></div>
        <p className="move-story-kicker"><span /> One next action</p>
        <h2>From amount to completed.<br />Without exposing the machinery.</h2>
        <p>
          Every new move gets a fresh quote, re-checks limits and availability,
          and produces one customer receipt.
        </p>
        <div>
          <a href="#move-quote" className="move-story-primary">Get a fresh quote <Arrow /></a>
          <Link href="/how-it-works" className="move-story-secondary">See how every state works</Link>
        </div>
      </section>
    </div>
  );
}
