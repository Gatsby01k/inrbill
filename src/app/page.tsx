import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { Reveal } from "@/components/motion";
import { LiquidityOrbit, NetworkConsole } from "@/components/site/liquidity-experience";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";

const proof = [
  ["3", "INR corridors"],
  ["24–48h", "First response"],
  ["Human-led", "Network decisions"],
  ["Zero", "Custody or execution"],
];

const corridors = [
  ["01", "INR → USDT", "Verified INR-side capacity for companies with a defined stablecoin settlement requirement."],
  ["02", "USDT → INR", "Reviewed counterparties and current operating coverage for INR liquidity requirements."],
  ["03", "INR payouts", "Qualified operating partners for controlled business payout workflows."],
];

const evidence = [
  ["Entity & ownership", "Human review", "The counterparty behind the profile is documented before access."],
  ["Banking coverage", "Evidence recorded", "Operating rails and declared coverage are reviewed, not inferred."],
  ["Capacity", "Time-bound", "Availability is a current signal with an expiry, not a permanent claim."],
  ["Routing", "Explainable", "Every shortlist is tied to the actual requirement and network rules."],
  ["Introduction", "Controlled", "Identity is released only after both sides are ready to proceed."],
  ["Settlement", "Direct", "Counterparties agree terms and move funds under their own agreements."],
];

function Arrow() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <span className="v3-check" aria-hidden="true">
      <svg viewBox="0 0 14 14" fill="none"><path d="m3 7 2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="marketing-site v3-site">
      <SiteNav />
      <main>
        <section className="v3-hero">
          <div className="v3-hero-sticky">
            <div className="v3-hero-grid">
              <div className="v3-hero-copy">
                <p className="v3-kicker"><span /> Private INR liquidity network</p>
                <h1>India&apos;s liquidity,<br /><em>reviewed.</em></h1>
                <p className="v3-hero-lede">
                  Verified counterparties, current capacity and governed introductions for INR ↔ USDT and INR payout corridors.
                </p>
                <div className="v3-actions">
                  <Link href="/request" className="v3-button v3-button-primary">Request company access <Arrow /></Link>
                  <Link href="/apply" className="v3-button v3-button-quiet">Apply as liquidity partner</Link>
                </div>
                <div className="v3-trust-line">
                  <span><Check /> Manual review</span>
                  <span><Check /> Controlled introductions</span>
                  <span><Check /> Direct settlement</span>
                </div>
              </div>
              <LiquidityOrbit />
            </div>

            <div className="v3-proof-strip">
              {proof.map(([value, label], index) => (
                <div key={label}><span>0{index + 1}</span><strong>{value}</strong><small>{label}</small></div>
              ))}
            </div>
            <a className="v3-scroll-cue" href="#product" aria-label="Explore the product"><span>Launch</span><i /></a>
          </div>
        </section>

        <section id="product" className="v3-manifesto">
          <div className="v3-manifesto-field" aria-hidden="true" />
          <div className="v3-shell">
            <Reveal className="v3-manifesto-grid">
              <p className="v3-section-index">01 / Why INRP2P</p>
              <div>
                <p className="v3-kicker"><span /> The missing layer</p>
                <h2>Liquidity is easy.<br /><em>Accountability is rare.</em></h2>
              </div>
              <div className="v3-manifesto-copy">
                <p>INRP2P is not an exchange, an order book or another anonymous contact list.</p>
                <p>It is the private control layer between a real requirement and a qualified counterparty: review first, introduction second, settlement direct.</p>
                <Link href="/how-it-works">Read the operating standard <Arrow /></Link>
              </div>
            </Reveal>

            <div className="v3-principles">
              <Reveal index={0} className="v3-principle"><span>01</span><h3>Know who is behind the capacity.</h3><p>Entity, ownership, banking coverage and risk evidence become one reusable trust record.</p></Reveal>
              <Reveal index={1} className="v3-principle"><span>02</span><h3>Know whether capacity is current.</h3><p>Short operating windows replace stale promises and automatically disappear when they expire.</p></Reveal>
              <Reveal index={2} className="v3-principle"><span>03</span><h3>Know why a match was made.</h3><p>Corridor, rail, volume, verification and network permission explain every shortlist.</p></Reveal>
            </div>
          </div>
        </section>

        <section id="operating-model" className="v3-model">
          <div className="v3-shell">
            <Reveal className="v3-model-head">
              <div><p className="v3-kicker v3-kicker-on-dark"><span /> Governed by design</p><h2>One requirement.<br /><em>One controlled route.</em></h2></div>
              <p>Explore the four decisions that convert an unverified contact into a qualified bilateral introduction.</p>
            </Reveal>
            <Reveal threshold={0.08}><NetworkConsole /></Reveal>
          </div>
        </section>

        <section className="v3-corridors">
          <div className="v3-corridors-bg" aria-hidden="true" />
          <div className="v3-shell v3-corridors-shell">
            <Reveal className="v3-corridors-head">
              <p className="v3-section-index">03 / Live scope</p>
              <div><p className="v3-kicker"><span /> Three corridors</p><h2>One standard of trust,<br />across every direction.</h2></div>
              <p>Start with the requirement. INRP2P finds the reviewed operating relationships eligible for that specific route.</p>
            </Reveal>
            <div className="v3-corridor-list">
              {corridors.map(([number, title, body], index) => (
                <Reveal key={number} index={index} className="v3-corridor-row">
                  <span>{number}</span><h3>{title}</h3><p>{body}</p><BrandMark size={25} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="controls" className="v3-evidence">
          <div className="v3-shell">
            <Reveal className="v3-evidence-head">
              <div className="v3-zero">0</div>
              <div><p className="v3-kicker"><span /> Custody position</p><h2>We control the introduction.<br /><em>Never the money.</em></h2></div>
              <p>Automation reduces operational friction. It never turns provider output into an invisible approval or moves funds on behalf of either side.</p>
            </Reveal>

            <div className="v3-ledger">
              <div className="v3-ledger-head"><span>Control record</span><span>Decision</span><span>What it means</span></div>
              {evidence.map(([name, decision, meaning], index) => (
                <Reveal key={name} index={index} className="v3-ledger-row">
                  <span><i>0{index + 1}</i>{name}</span><strong><Check />{decision}</strong><p>{meaning}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="v3-access">
          <div className="v3-access-panel v3-access-company">
            <div className="v3-access-number">C</div>
            <div>
              <p className="v3-kicker"><span /> For companies</p>
              <h2>Build a network your team can defend.</h2>
              <p>Create controlled requirements, see current eligible capacity and release only the relationships you are ready to use.</p>
              <Link href="/request">Request company access <Arrow /></Link>
            </div>
          </div>
          <div className="v3-access-panel v3-access-partner">
            <div className="v3-access-number">P</div>
            <div>
              <p className="v3-kicker v3-kicker-on-dark"><span /> For liquidity partners</p>
              <h2>Make credibility operational.</h2>
              <p>Maintain one reviewed profile, signal live capacity and receive only qualified requirements from accepted networks.</p>
              <Link href="/apply">Apply for partner review <Arrow /></Link>
            </div>
          </div>
        </section>

        <section className="v3-final">
          <div className="v3-final-rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="v3-final-mark"><BrandMark size={72} /></div>
          <p className="v3-kicker"><span /> Private access</p>
          <h2>Put verified ground beneath<br />every INR relationship.</h2>
          <p>Manual review. Current capacity. Controlled introductions. No custody. No execution.</p>
          <div className="v3-actions">
            <Link href="/request" className="v3-button v3-button-primary">Request access <Arrow /></Link>
            <Link href="/how-it-works" className="v3-button v3-button-quiet">See how it works</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
