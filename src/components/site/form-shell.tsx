import { SiteNav } from "./nav";
import { SiteFooter } from "./footer";

export function FormShell({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl text-slate-50 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">{sub}</p>
          <div className="mt-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
