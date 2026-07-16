import { SiteNav } from "./nav";
import { SiteFooter } from "./footer";

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
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="fin-form-page flex-1">
        <div className={wide ? "fin-form-container max-w-6xl" : "fin-form-container max-w-3xl"}>
          <header className="fin-form-header">
            <div className="fin-form-intro"><p className="fin-kicker"><span /> {eyebrow}</p><h1>{title}</h1><p>{sub}</p>
              <div className="fin-form-facts" aria-label="Application facts">
                {facts.map((fact, index) => <span key={fact}><strong>0{index + 1}</strong>{fact}</span>)}
              </div>
            </div>
            <aside className="fin-form-assurance" aria-label="What happens next">
              <small>What happens next</small>
              <div><i>1</i><span><strong>Submit</strong><em>Your information enters a private review queue.</em></span></div>
              <div><i>2</i><span><strong>Review</strong><em>A network operator checks fit and evidence.</em></span></div>
              <div><i>3</i><span><strong>Decision</strong><em>You receive a direct response, never a public listing.</em></span></div>
              <p>No custody · No automatic approval</p>
            </aside>
          </header>
          <div className="fin-form-body">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
