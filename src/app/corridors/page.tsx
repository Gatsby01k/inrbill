import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { Stat } from "@/components/ui";
import { CORRIDOR_CONTENT } from "@/lib/corridor-content";
import { CORRIDOR_SLUGS, getCorridorSnapshot, slugToDirection } from "@/lib/corridor-page";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "INR liquidity corridors — coverage, demand & reference rates",
  description:
    "Browse INRP2P's three liquidity corridors — INR to USDT, USDT to INR, and INR payouts — with real, currently-active partner coverage, recent demand, turnaround and reference settlement rates for each.",
  alternates: { canonical: "/corridors" },
};

export default async function CorridorsHubPage() {
  const snapshots = await Promise.all(
    CORRIDOR_SLUGS.map((slug) => getCorridorSnapshot(slugToDirection(slug)!)),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="hero-aurora flex-1 pb-24 pt-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow">Corridors</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-900 sm:text-[2.5rem]">
            Three corridors, real coverage.
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">
            INRP2P matches on three corridors. Each page below is a live snapshot — active
            reviewed partners, recent demand, turnaround, and (where applicable) a reference
            settlement-rate range from deals that actually closed. Not a directory, not a price
            feed — real, currently-active network data.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {CORRIDOR_SLUGS.map((slug, i) => {
              const content = CORRIDOR_CONTENT[slug];
              const s = snapshots[i];
              return (
                <Reveal key={slug} index={i} className="card flex h-full flex-col p-5">
                  <p className="eyebrow text-leaf-600">{s.label}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{content.intro.slice(0, 120)}…</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Stat label="Partners" value={s.activePartners} />
                    <Stat label="Requests · 14d" value={s.requestsLast14d} />
                  </div>
                  <Link href={`/corridors/${slug}`} className="btn btn-ghost btn-sm mt-4">
                    View corridor →
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/request" className="btn btn-gold px-5 py-3">
              Submit a request
            </Link>
            <Link href="/inr-p2p-index" className="text-xs font-medium text-slate-400 hover:underline">
              Full network index →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
