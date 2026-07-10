import { DEAL_STEPS, dealStageHint, stageIndex, type DealStageKey } from "@/lib/deal-stage";
import { cn } from "@/lib/format";

/** Horizontal 5-step progress bar shared by company/partner/admin deal pages. */
export function DealProgress({ stage }: { stage: DealStageKey }) {
  if (stage === "rejected") {
    return <p className="text-sm leading-relaxed text-rose-600">{dealStageHint("rejected", "company").body}</p>;
  }

  const idx = stageIndex(stage);
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {DEAL_STEPS.map((s, i) => {
        const reached = i <= idx;
        const current = i === idx;
        return (
          <li key={s.key} className="flex items-center sm:flex-1">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                reached
                  ? "border-gold-500/60 bg-gold-500/15 text-gold-700"
                  : "border-black/10 bg-black/[0.02] text-slate-400",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "ml-2.5 text-xs font-medium",
                current ? "text-gold-700" : reached ? "text-slate-700" : "text-slate-400",
              )}
            >
              {s.label}
            </span>
            {i < DEAL_STEPS.length - 1 ? (
              <span
                className={cn("mx-3 hidden h-px flex-1 sm:block", i < idx ? "bg-gold-500/40" : "bg-black/10")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact "what's happening / what's next" card — plain-language context so
    nobody lands on a workspace page wondering what to do next. */
export function NextStepHint({ stage, role }: { stage: DealStageKey; role: "company" | "partner" | "admin" }) {
  const hint = dealStageHint(stage, role);
  return (
    <div className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">{hint.title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{hint.body}</p>
    </div>
  );
}
