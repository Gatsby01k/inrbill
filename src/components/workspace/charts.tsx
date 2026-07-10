// Small, dependency-free chart primitives — no chart library is installed
// (and this sandbox can't npm install one), so these are plain CSS/Tailwind
// bars rather than SVG or a canvas library. Deliberately minimal: exactly
// the two shapes the analytics dashboard needs, nothing generic-for-its-own-
// sake.

import { cn, money } from "@/lib/format";

type FunnelRow = { key: string; label: string; count: number; pctOfTotal: number };

/** Horizontal funnel — one row per stage, bar width = % of total requests
    that reached at least that stage, with the drop-off to the next stage
    called out explicitly (the number ops actually cares about: how many
    were lost at each handoff, not just the raw counts). */
export function FunnelBars({ rows }: { rows: FunnelRow[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const next = rows[i + 1];
        const dropOff = next ? row.count - next.count : null;
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="tabular-nums text-slate-500">
                {row.count} <span className="text-slate-400">({row.pctOfTotal}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.05]">
              <div
                className="h-full rounded-full bg-gold-500"
                style={{ width: `${Math.max(row.pctOfTotal, row.count > 0 ? 2 : 0)}%` }}
              />
            </div>
            {dropOff !== null && dropOff > 0 ? (
              <p className="mt-1 text-[10.5px] text-slate-400">
                ↓ {dropOff} didn&apos;t reach the next stage
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type TrendPoint = { label: string; totals: Partial<Record<string, number>> };

/** One small bar chart per currency present in the data, each scaled to its
    own max — mixing INR (lakhs/crores) and USDT (hundreds) on one shared
    axis would make the smaller currency invisible, so each gets its own
    proportional scale instead of a shared one. */
export function TrendBarChart({ points, currencies }: { points: TrendPoint[]; currencies: string[] }) {
  const active = currencies.filter((c) => points.some((p) => (p.totals[c] ?? 0) > 0));
  if (active.length === 0) {
    return <p className="text-[12.5px] text-slate-400">No paid revenue in this window yet.</p>;
  }
  return (
    <div className="space-y-5">
      {active.map((currency) => {
        const max = Math.max(1, ...points.map((p) => p.totals[currency] ?? 0));
        return (
          <div key={currency}>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              {currency}
            </p>
            <div className="flex h-24 items-end gap-1.5">
              {points.map((p) => {
                const v = p.totals[currency] ?? 0;
                const pct = Math.max(v > 0 ? 4 : 0, (v / max) * 100);
                return (
                  <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-full w-full items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-all",
                          v > 0 ? "bg-leaf-500/70" : "bg-black/[0.04]",
                        )}
                        style={{ height: `${pct}%` }}
                        title={v > 0 ? money(v, currency) : undefined}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
