import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { FintechMedallion } from "@/components/site/fintech-medallion";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";

const pillars = [
  ["01", "Trust Passport", "One reusable, human-reviewed record for entity, banking, sanctions, wallet-risk and reference checks."],
  ["02", "Live capacity", "Short availability windows replace stale promises. Expired capacity is removed from routing automatically."],
  ["03", "Explainable routing", "Direction, bank, rail, volume, verification and network eligibility create every shortlist — never a black box."],
];

const flow = [
  ["01", "Verify", "Identity, controls and evidence"],
  ["02", "Connect", "Private bilateral network access"],
  ["03", "Signal", "Current capacity and coverage"],
  ["04", "Route", "Requirement-specific shortlist"],
  ["05", "Introduce", "Human-controlled release"],
];

const controls = [
  "Email ownership before workspace access",
  "Human decision after provider checks",
  "Restricted evidence with explicit visibility",
  "Signed webhooks and replay protection",
  "Durable rate limits on public intake",
  "Append-only operational audit trail",
];

function Arrow() {
  return <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.75 9h10.5M10 4.75 14.25 9 10 13.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Check() {
  return <span className="fin-check" aria-hidden="true"><svg viewBox="0 0 14 14" fill="none"><path d="m3 7 2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}

export default function HomePage() {
  return (
    <div className="marketing-site">
      <SiteNav />
      <main>
        <section className="fin-hero">
          <div className="fin-route-field" aria-hidden="true"><i /><i /><i /><b /><b /><b /></div>
          <div className="fin-hero-grid">
            <div className="fin-hero-copy">
              <p className="fin-kicker"><span /> Private INR liquidity infrastructure</p>
              <h1>Private liquidity.<br /><em>Verified relationships.</em></h1>
              <p className="fin-lede">One controlled workspace for companies and professional liquidity partners to verify, signal capacity, route requirements and release qualified introductions.</p>
              <div className="fin-actions">
                <Link className="fin-btn fin-btn-primary" href="/request">Request network access <Arrow /></Link>
                <Link className="fin-btn fin-btn-secondary" href="/apply">Join as a partner</Link>
              </div>
              <p className="fin-beta"><span /> Private beta · Every application reviewed by a person</p>
            </div>
            <FintechMedallion />
          </div>
          <div className="fin-proof-strip">
            <div><strong>24–48h</strong><span>First review</span></div>
            <div><strong>5 stages</strong><span>Controlled flow</span></div>
            <div><strong>12 months</strong><span>Verification validity</span></div>
            <div><strong>Zero</strong><span>Custody or execution</span></div>
          </div>
        </section>

        <section id="product" className="fin-section fin-intro">
          <div className="fin-section-head">
            <p className="fin-kicker"><span /> The control layer</p>
            <h2>Where serious INR liquidity becomes visible, verifiable and operable.</h2>
            <p>INRP2P replaces scattered broker contacts and unverifiable chat claims with a private network operating model. Trust remains human. Operations become structured.</p>
          </div>
          <div className="fin-pillars">
            {pillars.map(([number, title, body]) => <article key={number} className="fin-pillar"><div><span>{number}</span><i /></div><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section id="operating-model" className="fin-flow-section">
          <div className="fin-flow-inner">
            <div className="fin-flow-title">
              <p className="fin-kicker fin-kicker-dark"><span /> The operating model</p>
              <h2>One requirement.<br /><em>One governed route.</em></h2>
              <p>No public order book. No anonymous counterparties. No silent automated approvals.</p>
            </div>
            <div className="fin-flow">
              {flow.map(([number, title, body], index) => <div className="fin-flow-step" key={number}><div className="fin-flow-node"><BrandMark size={22} /><span>{number}</span></div>{index < flow.length - 1 ? <div className="fin-flow-line" /> : null}<h3>{title}</h3><p>{body}</p></div>)}
            </div>
            <div className="fin-flow-note"><span>Settlement</span><p>Once introduced, counterparties agree terms and settle directly under their own agreements.</p><strong>INRP2P never touches funds.</strong></div>
          </div>
        </section>

        <section className="fin-audiences">
          <article className="fin-audience fin-audience-company">
            <p className="fin-kicker"><span /> For companies</p><h2>Own the network.<br />Not a broker spreadsheet.</h2>
            <p>Invite trusted relationships, require a reusable verification case and route each requirement only to eligible, current capacity.</p>
            <ul><li><Check /> Private partner graph</li><li><Check /> Requirement-level routing controls</li><li><Check /> Controlled identity release</li></ul>
            <Link href="/request" className="fin-text-link">Create company workspace <Arrow /></Link>
          </article>
          <article className="fin-audience fin-audience-partner">
            <p className="fin-kicker fin-kicker-dark"><span /> For liquidity partners</p><h2>Turn credibility into qualified demand.</h2>
            <p>Maintain one trust profile, publish short capacity windows and receive relevant requirements from networks you explicitly accepted.</p>
            <ul><li><Check /> Private until introduction</li><li><Check /> No public listing or cold inbound</li><li><Check /> You confirm every opportunity</li></ul>
            <Link href="/apply" className="fin-text-link fin-text-link-light">Apply for review <Arrow /></Link>
          </article>
        </section>

        <section id="controls" className="fin-section fin-controls">
          <div className="fin-controls-number">0</div>
          <div className="fin-controls-copy"><p className="fin-kicker"><span /> Risk position</p><h2>Automation removes friction.<br />People still decide trust.</h2><p>Provider output is normalized and recorded, never converted into invisible approval. Introductions remain controlled; settlement remains bilateral.</p></div>
          <div className="fin-control-list">{controls.map((control) => <div key={control}><Check /><span>{control}</span></div>)}</div>
        </section>

        <section className="fin-final-cta">
          <div className="fin-final-orbit" aria-hidden="true" />
          <div className="fin-final-inner"><BrandMark size={44} /><p className="fin-kicker"><span /> Private beta</p><h2>Build your INR partner network on verified ground.</h2><p>Start with one corridor, a small counterparty set and an operating model your team can actually control.</p><div className="fin-actions"><Link className="fin-btn fin-btn-primary" href="/request">Request access <Arrow /></Link><Link className="fin-btn fin-btn-secondary" href="/how-it-works">See how it works</Link></div></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
