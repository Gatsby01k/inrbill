import { SiteNav } from "./nav";
import { SiteFooter } from "./footer";

export function FormShell({
  eyebrow,
  title,
  sub,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="fin-form-page flex-1">
        <div className={wide ? "fin-form-container max-w-5xl" : "fin-form-container max-w-3xl"}>
          <header className="fin-form-header">
            <div><p className="fin-kicker"><span /> {eyebrow}</p><h1>{title}</h1><p>{sub}</p></div>
            <div className="fin-form-assurance" aria-label="Submission assurances">
              <span><strong>01</strong> Private intake</span>
              <span><strong>02</strong> Human review</span>
              <span><strong>03</strong> Controlled introduction</span>
            </div>
          </header>
          <div className="fin-form-body">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
