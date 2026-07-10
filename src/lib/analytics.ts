// Deterministic operational analytics — no LLM involved here on purpose.
// Funnel counts and timing averages are exact arithmetic over data we
// already have; running them through an AI call would add cost, latency,
// and a chance of the model just getting the math wrong. The AI budget in
// this app is reserved for judgment calls (triage, explanations, the
// corridor market brief) — not counting and averaging.
//
// Funnel staging reuses deriveRequestStage (src/lib/deal-stage.ts), the
// same function that drives the visual stepper and "what's next" hint on
// individual request pages, so the dashboard's picture of "where deals are"
// can never quietly drift from what a company or partner sees on their own
// page for the same request.

import type { Currency, IntroductionStatus, MatchStatus } from "@prisma/client";
import { DEAL_STEPS, deriveRequestStage, type DealStageKey, type MatchStageInput } from "@/lib/deal-stage";

export type FunnelCounts = Record<DealStageKey, number> & { rejected: number };

type FunnelRequest = {
  status: Parameters<typeof deriveRequestStage>[0];
  matches: MatchStageInput[];
};

/** Buckets every request into its current stage. One request contributes to
    exactly one bucket — its single most-advanced stage — so the counts sum
    to the total request count and read as a real funnel, not overlapping
    tallies. */
export function computeFunnel(requests: FunnelRequest[]): FunnelCounts {
  const counts: FunnelCounts = {
    submitted: 0,
    matching: 0,
    introduced: 0,
    in_discussion: 0,
    closed: 0,
    rejected: 0,
  };
  for (const r of requests) {
    const stage = deriveRequestStage(r.status, r.matches);
    counts[stage] += 1;
  }
  return counts;
}

/** Stage-over-stage conversion — what fraction of requests that reached
    stage N also reached stage N+1 (or later). Rejected requests are excluded
    from the denominator entirely since they left the funnel, not stalled in
    it — mixing them in would understate every conversion rate. */
export function funnelConversionRows(counts: FunnelCounts) {
  const total = DEAL_STEPS.reduce((n, s) => n + counts[s.key], 0);
  let remaining = total;
  return DEAL_STEPS.map((step) => {
    const atOrPast = remaining;
    const row = {
      key: step.key,
      label: step.label,
      count: atOrPast,
      pctOfTotal: total > 0 ? Math.round((atOrPast / total) * 100) : 0,
    };
    remaining -= counts[step.key];
    return row;
  });
}

type TimingRequest = {
  createdAt: Date;
  matches: { createdAt: Date; status: MatchStatus; introductions: TimingIntro[] }[];
};
type TimingIntro = {
  createdAt: Date;
  updatedAt: Date;
  respondedAt: Date | null;
  status: IntroductionStatus;
};

export type TimingAverages = {
  avgHoursToFirstMatch: number | null;
  avgHoursToFirstIntro: number | null;
  avgHoursToClose: number | null;
  sampleSizes: { toMatch: number; toIntro: number; toClose: number };
};

const hoursBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Average turnaround at each handoff in the pipeline, in hours. Every
    metric here is measured from timestamps that already exist on the
    records — no new schema, no guessing. "Time to close" uses respondedAt
    when set (the more precise signal) and falls back to updatedAt, since a
    SUCCESSFUL/FAILED introduction's last update is almost always the
    outcome call itself. */
export function computeTimingAverages(requests: TimingRequest[]): TimingAverages {
  const toMatch: number[] = [];
  const toIntro: number[] = [];
  const toClose: number[] = [];

  for (const r of requests) {
    if (r.matches.length > 0) {
      const firstMatch = r.matches.reduce((min, m) => (m.createdAt < min ? m.createdAt : min), r.matches[0].createdAt);
      toMatch.push(hoursBetween(r.createdAt, firstMatch));
    }
    for (const m of r.matches) {
      if (m.introductions.length > 0) {
        const firstIntro = m.introductions.reduce(
          (min, i) => (i.createdAt < min ? i.createdAt : min),
          m.introductions[0].createdAt,
        );
        toIntro.push(hoursBetween(m.createdAt, firstIntro));
      }
      for (const i of m.introductions) {
        if (i.status === "SUCCESSFUL" || i.status === "FAILED") {
          const outcomeAt = i.respondedAt ?? i.updatedAt;
          toClose.push(hoursBetween(i.createdAt, outcomeAt));
        }
      }
    }
  }

  return {
    avgHoursToFirstMatch: avg(toMatch),
    avgHoursToFirstIntro: avg(toIntro),
    avgHoursToClose: avg(toClose),
    sampleSizes: { toMatch: toMatch.length, toIntro: toIntro.length, toClose: toClose.length },
  };
}

export function fmtHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export type RevenueTrendPoint = { label: string; totals: Partial<Record<Currency, number>> };

/** Buckets PAID revenue by calendar month, oldest first, for the trailing
    `months` months (default 6) — including months with zero revenue, so a
    trend chart doesn't silently skip a dead month. */
export function computeRevenueTrend(
  records: { amount: string | number | { toString(): string }; currency: Currency; paidAt: Date | null; createdAt: Date }[],
  months = 6,
): RevenueTrendPoint[] {
  const now = new Date();
  const buckets: RevenueTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: d.toLocaleDateString("en-US", { month: "short" }), totals: {} });
  }
  const startWindow = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  for (const r of records) {
    const at = r.paidAt ?? r.createdAt;
    if (at < startWindow) continue;
    const idx = (at.getFullYear() - startWindow.getFullYear()) * 12 + (at.getMonth() - startWindow.getMonth());
    if (idx < 0 || idx >= buckets.length) continue;
    const n = typeof r.amount === "number" ? r.amount : Number(r.amount.toString());
    if (!Number.isFinite(n)) continue;
    buckets[idx].totals[r.currency] = (buckets[idx].totals[r.currency] ?? 0) + n;
  }
  return buckets;
}
