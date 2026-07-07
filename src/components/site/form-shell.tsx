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
      <main className="hero-aurora flex-1 pb-24 pt-32">
        <div className={wide ? "mx-auto max-w-5xl px-4 sm:px-6" : "mx-auto max-w-3xl px-4 sm:px-6"}>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-900 sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-slate-500">
            {sub}
          </p>
          <div className="mt-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
