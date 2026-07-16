import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";

export function AuthFrame({ eyebrow, title, sub, children, centered = false }: { eyebrow:string; title:string; sub:string; children:React.ReactNode; centered?:boolean }) {
  return <div className="fin-auth-page">
    <header className="fin-auth-topbar">
      <Link href="/" className="fin-auth-brand"><BrandMark size={30} /><Wordmark /></Link>
      <Link href="/" className="fin-auth-back">Back to network <span aria-hidden>↗</span></Link>
    </header>
    <main className="fin-auth-stage">
      <aside className="fin-auth-trust">
        <p className="fin-kicker"><span /> Private network workspace</p>
        <h1>One secure entry.<br />Three accountable roles.</h1>
        <p className="fin-auth-trust-lede">Access is issued only after a company, partner or network operator has been reviewed and assigned a role.</p>
        <div className="fin-auth-trust-list" aria-label="Workspace controls">
          <div><i>01</i><span><strong>Verified ownership</strong><small>Email and workspace identity are confirmed.</small></span></div>
          <div><i>02</i><span><strong>Role-bound access</strong><small>Every account opens only its approved workspace.</small></span></div>
          <div><i>03</i><span><strong>Accountable sessions</strong><small>Security events and decisions remain traceable.</small></span></div>
        </div>
        <p className="fin-auth-trust-foot"><span /> No public registration · Access by review</p>
      </aside>
      <section className="fin-auth-panel"><div className={`fin-auth-form ${centered ? "text-center" : ""}`}>
        <p className={`fin-kicker ${centered ? "justify-center" : ""}`}><span /> {eyebrow}</p>
        <h2>{title}</h2>
        <p className="fin-auth-sub">{sub}</p>
        <div className="fin-auth-fields">{children}</div>
      </div></section>
    </main>
  </div>;
}
