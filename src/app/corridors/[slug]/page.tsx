import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion";
import { ApplyTraderCta } from "@/components/site/apply-trader-cta";
import { CorridorCalculator } from "@/components/site/corridor-calculator";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { EmptyState, Stat } from "@/components/ui";
import { fmtHours } from "@/lib/analytics";
import { CORRIDOR_CONTENT } from "@/lib/corridor-content";
import { CORRIDOR_SLUGS, getCorridorSnapshot, slugToDirection, type CorridorSlug } from "@/lib/corridor-page";
import { SITE_URL } from "@/lib/site";

// Same hourly-freshness rationale as /inr-p2p-index — this is real network
// data, not a live feed, so an hour of staleness is honest and cheap.
export const revalidate = 3600;

export function generateStaticParams() {
  return CORRIDOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = CORRIDOR_CONTENT[slug as CorridorSlug];
  if (!content) return {};
  return {
    title: content.title,
    description: content.metaDescription,
    alternates: { canonical: `/corridors/${slug}` },
  };
}

export default async function CorridorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const direction = slugToDirection(slug);
  const content = CORRIDOR_CONTENT[slug as CorridorSlug];
  if (!direction || !content) notFound();

  const snapshot = await getCorridorSnapshot(direction);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: content.title,
        description: content.metaDescription,
        url: `${SITE_URL}/corridors/${slug}`,
        provider: { "@type": "Organization", name: "INRP2P", url: SITE_URL },
        areaServed: "IN",
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  const growthPct =
    snapshot.requestsPrior14d > 0
      ? Math.round(((snapshot.requestsLast14d - snapshot.requestsPrior14d) / snapshot.requestsPrior14d) * 100)
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main className="hero-aurora flex-1 pb-24 pt-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow">Corridor snapshot · updated hourly</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-medium leading-tight text-slate-900 sm:text-[2.5rem]">
            {content.title}.
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">{content.intro}</p>

          {/* Stats */}
          <Reveal index={1} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Active partners" value={snapshot.activePartners} tone="gold" />
            <Stat
              label="Requests · 14d"
              value={snapshot.requestsLast14d}
              sub={growthPct === null ? undefined : `${growthPct > 0 ? "+" : ""}${growthPct}% vs prior 14d`}
            />
            <Stat label="Avg. time to first match" value={fmtHours(snapshot.timing.avgHoursToFirstMatch)} />
            <Stat label="Avg. time to close" value={fmtHours(snapshot.timing.avgHoursToClose)} />
          </Reveal>

          {snapshot.activePartners < 3 ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">
              INRP2P is in private beta and onboards partners deliberately — small, real numbers here,
              not inflated ones.{" "}
              <Link href="/apply" className="text-gold-600 hover:underline">
                Apply as a partner
              </Link>{" "}
              to help fill this corridor.
            </p>
          ) : null}

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-8">
              {/* Coverage */}
              <div>
                <p className="eyebrow text-leaf-600">Coverage</p>
                {snapshot.banks.length || snapshot.methods.length ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                        Banks covered
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {snapshot.banks.map((b) => (
                          <span key={b} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                        Rails covered
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {snapshot.methods.map((m) => (
                          <span key={m} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyState
                      title="Coverage building"
                      body="No verified partner on this corridor yet. If you can fund it, apply."
                    />
                  </div>
                )}
              </div>

              {/* Reference rate — only meaningful for the two FX corridors */}
              {snapshot.direction !== "INR_PAYOUTS" ? (
                <div>
                  <p className="eyebrow text-gold-700">
                    Reference rate · closed deals{snapshot.rate ? `, last ${snapshot.rate.windowDays} days` : ""}
                  </p>
                  {snapshot.rate ? (
                    <Reveal className="card mt-4 max-w-sm p-5">
                      <p className="tnum text-[22px] font-semibold text-slate-900">
                        ₹{snapshot.rate.min.toFixed(2)} – ₹{snapshot.rate.max.toFixed(2)}
                      </p>
                      <p className="mt-1 text-[11.5px] text-slate-500">
                        Median ₹{snapshot.rate.median.toFixed(2)}/USDT · {snapshot.rate.count} closed deal
                        {snapshot.rate.count === 1 ? "" : "s"}
                      </p>
                    </Reveal>
                  ) : (
                    <div className="mt-4 max-w-sm">
                      <EmptyState
                        title="Not enough closed deals yet"
                        body="A range only publishes once enough deals close on this corridor recently — real numbers, not a guess."
                      />
                    </div>
                  )}
                  <p className="mt-3 max-w-md text-[11px] leading-relaxed text-slate-400">
                    Effective settlement rates from closed introductions, not asks or quotes. Not a price
                    feed, not investment advice, not a guarantee.
                  </p>
                </div>
              ) : null}

              {/* FAQ */}
              <div>
                <p className="eyebrow">Frequently asked</p>
                <div className="mt-4 space-y-4">
                  {content.faq.map((f, i) => (
                    <Reveal key={f.q} index={i} className="card p-5">
                      <p className="text-[13px] font-semibold text-slate-900">{f.q}</p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{f.a}</p>
                    </Reveal>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/request" className="btn btn-gold px-5 py-3">
                  Submit a request
                </Link>
                <ApplyTraderCta />
                <Link href="/corridors" className="text-xs font-medium text-slate-400 hover:underline">
                  See all corridors →
                </Link>
              </div>
            </div>

            <div>
              <CorridorCalculator requestType={content.requestType} directionValue={snapshot.direction} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
