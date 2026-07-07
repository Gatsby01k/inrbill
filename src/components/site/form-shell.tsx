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
      <main className="grid-bg flex-1 pb-24 pt-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="eyebrow reveal">{eyebrow}</p>
          <h1 className="reveal reveal-1 mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-50 sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="reveal reveal-2 mt-3 max-w-xl text-[13.5px] leading-relaxed text-slate-500">
            {sub}
          </p>
          <div className="reveal reveal-3 mt-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
