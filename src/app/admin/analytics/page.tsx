import type { Metadata } from "next";
import {
  computeFunnel,
  computeRevenueTrend,
  computeTimingAverages,
  fmtHours,
  funnelConversionRows,
} from "@/lib/analytics";
import { PageHeader, SectionTitle, Stat } from "@/components/ui";
import { AiMarketBrief } from "@/components/workspace/ai-market-brief";
import { FunnelBars, TrendBarChart } from "@/components/workspace/charts";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/options";

export const metadata: Metadata = { title: "Analytics" };

const WINDOW_DAYS = 90;

export default async function AdminAnalyticsPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [requests, paidRevenue] = await Promise.all([
    db.liquidityRequest.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        createdAt: true,
        matches: {
          select: {
            status: true,
            createdAt: true,
            introductions: {
              select: {
                status: true,
                createdAt: true,
                updatedAt: true,
                respondedAt: true,
                _count: { select: { messages: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    db.revenueRecord.findMany({
      where: { status: "PAID" },
      select: { amount: true, currency: true, paidAt: true, createdAt: true },
    }),
  ]);

  // Most matches have at most one introduction in practice, but the schema
  // allows more — use the latest for "current stage" (what's actually
  // happening now) and the earliest for "time to first intro" below.
  const funnelInput = requests.map((r) => ({
    status: r.status,
    matches: r.matches.map((m) => {
      const latest = m.introductions[m.introductions.length - 1];
      return {
        matchStatus: m.status,
        releasedToCompany: true,
        releasedToPartner: true,
        introStatus: latest?.status ?? null,
        hasMessages: (latest?._count.messages ?? 0) > 0,
      };
    }),
  }));
  const funnel = computeFunnel(funnelInput);
  const funnelRows = funnelConversionRows(funnel);
  const totalInWindow = funnelRows[0]?.count ?? 0;

  const timing = computeTimingAverages(
    requests.map((r) => ({
      createdAt: r.createdAt,
      matches: r.matches.map((m) => ({
        createdAt: m.createdAt,
        status: m.status,
        introductions: m.introductions.map((i) => ({
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          respondedAt: i.respondedAt,
          status: i.status,
        })),
      })),
    })),
  );

  const revenueTrend = computeRevenueTrend(paidRevenue, 6);

  return (
    <>
      <PageHeader
        title="Analytics"
        sub={`Funnel, turnaround times and paid revenue over the trailing ${WINDOW_DAYS} days.`}
      />

      <div className="mb-4">
        <AiMarketBrief />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <SectionTitle
            title={`Deal funnel · ${totalInWindow} requests`}
            action={<span className="text-[11px] text-slate-400">Rejected: {funnel.rejected}</span>}
          />
          {totalInWindow > 0 ? (
            <FunnelBars rows={funnelRows} />
          ) : (
            <p className="text-[12.5px] text-slate-400">No requests submitted in this window yet.</p>
          )}
        </div>

        <div className="card p-5">
          <SectionTitle title="Turnaround" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Submit → first match"
              value={fmtHours(timing.avgHoursToFirstMatch)}
              sub={`${timing.sampleSizes.toMatch} sample${timing.sampleSizes.toMatch === 1 ? "" : "s"}`}
            />
            <Stat
              label="Match → first intro"
              value={fmtHours(timing.avgHoursToFirstIntro)}
              sub={`${timing.sampleSizes.toIntro} sample${timing.sampleSizes.toIntro === 1 ? "" : "s"}`}
            />
            <Stat
              label="Intro → closed"
              value={fmtHours(timing.avgHoursToClose)}
              sub={`${timing.sampleSizes.toClose} sample${timing.sampleSizes.toClose === 1 ? "" : "s"}`}
            />
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
            Averages over requests submitted in the last {WINDOW_DAYS} days. Small sample sizes early on will
            swing a lot — treat these as directional until volume builds up.
          </p>
        </div>
      </div>

      <div className="mt-4 card p-5">
        <SectionTitle title="Paid revenue · last 6 months" />
        <TrendBarChart points={revenueTrend} currencies={[...CURRENCIES]} />
      </div>
    </>
  );
}
