import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";
import { FintechMedallion } from "@/components/site/fintech-medallion";

export function AuthFrame({ eyebrow, title, sub, children, centered = false }: { eyebrow:string; title:string; sub:string; children:React.ReactNode; centered?:boolean }) {
  return <div className="fin-auth-page">
    <aside className="fin-auth-art">
      <Link href="/" className="fin-auth-brand"><BrandMark size={34} /><Wordmark /></Link>
      <div className="fin-auth-medallion"><FintechMedallion /></div>
      <div className="fin-auth-art-copy"><p className="fin-kicker"><span /> Identity &amp; access</p><h1>Private by default.<br />Verified by design.</h1><p>Workspace access stays sealed behind confirmed ownership, strong credentials and accountable session controls.</p></div>
    </aside>
    <main className="fin-auth-panel"><div className={`fin-auth-form ${centered ? "text-center" : ""}`}>
      <div className="fin-auth-mobile-brand"><BrandMark size={34} /><Wordmark /></div>
      <p className={`fin-kicker ${centered ? "justify-center" : ""}`}><span /> {eyebrow}</p><h2>{title}</h2><p className="fin-auth-sub">{sub}</p><div className="fin-auth-fields">{children}</div>
    </div></main>
  </div>;
}
