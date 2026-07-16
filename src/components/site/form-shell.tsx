import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand";

export function FormShell({
  eyebrow,
  title,
  sub,
  children,
  wide = false,
  facts = ["Private intake", "Human review", "Controlled introduction"],
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  wide?: boolean;
  facts?: readonly string[];
}) {
  return (
    <div className="fin-intake-page">
      <aside className="fin-intake-sidebar">
        <Link href="/" className="fin-intake-brand"><BrandMark size={30} /><Wordmark className="text-white" /></Link>
        <div className="fin-intake-copy">
          <p className="fin-kicker"><span /> {eyebrow}</p>
          <h1>{title}</h1>
          <p>{sub}</p>
          <div className="fin-intake-facts" aria-label="Application facts">
            {facts.map((fact, index) => <span key={fact}><strong>0{index + 1}</strong>{fact}</span>)}
          </div>
        </div>
        <div className="fin-intake-sidebar-foot">
          <p>Private submission · Human review</p>
          <a href="mailto:info@inrp2p.com">Need help? Contact operations</a>
        </div>
      </aside>
      <main className="fin-intake-workspace">
        <header className="fin-intake-topbar">
          <Link href="/">← Back to INRP2P</Link>
          <span><i /> Secure intake</span>
        </header>
        <div className={wide ? "fin-intake-container max-w-4xl" : "fin-intake-container max-w-3xl"}>
          <div className="fin-form-body">{children}</div>
        </div>
      </main>
    </div>
  );
}
