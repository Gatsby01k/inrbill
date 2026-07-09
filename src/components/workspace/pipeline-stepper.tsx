import { cn, statusLabel } from "@/lib/format";

/**
 * Big horizontal progress stepper for the top of a record — replaces a
 * dropdown buried in the sidebar with the single, unmissable "where is this
 * right now, and where can it go" control. Each step is clickable (jumps
 * status directly, zero JS) except the terminal branch statuses, which
 * render as a separate flagged pill so they don't distort the linear flow.
 */
export function PipelineStepper<T extends string>({
  action,
  hidden,
  statusField = "status",
  steps,
  current,
  branches,
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
  statusField?: string;
  steps: readonly T[];
  current: T;
  /** Off-ramp statuses (e.g. REJECTED, DECLINED) shown as a separate flag, not part of the line. */
  branches?: readonly T[];
}) {
  const currentIndex = steps.indexOf(current);
  const onBranch = currentIndex === -1;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ol className="flex flex-wrap items-center">
        {steps.map((step, i) => {
          const done = !onBranch && i < currentIndex;
          const active = !onBranch && i === currentIndex;
          return (
            <li key={step} className="flex items-center">
              {i > 0 ? (
                <span
                  className={cn(
                    "mx-1.5 h-px w-5 shrink-0 sm:w-8",
                    done || active ? "bg-gold-500/60" : "bg-black/10",
                  )}
                />
              ) : null}
              <form action={action} className="contents">
                {Object.entries(hidden).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <input type="hidden" name={statusField} value={step} />
                <button
                  type="submit"
                  disabled={active}
                  title={statusLabel(step)}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                    active &&
                      "border-gold-600/60 bg-gradient-to-b from-gold-400 to-gold-600 text-[#231503] shadow-sm",
                    done &&
                      "border-leaf-400/40 bg-leaf-50 text-leaf-700 hover:border-leaf-500/60",
                    !active && !done && "border-black/10 bg-white text-slate-400 hover:border-black/25 hover:text-slate-600",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                      active && "bg-black/15 text-[#231503]",
                      done && "bg-leaf-500 text-white",
                      !active && !done && "bg-black/[0.06] text-slate-400",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {statusLabel(step)}
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      {branches?.length ? (
        <div className="flex items-center gap-1.5 border-l border-black/10 pl-3">
          {branches.map((b) => {
            const active = b === current;
            return (
              <form key={b} action={action} className="contents">
                {Object.entries(hidden).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <input type="hidden" name={statusField} value={b} />
                <button
                  type="submit"
                  disabled={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                    active
                      ? "pointer-events-none border-rose-500/50 bg-rose-500/[0.1] text-rose-700"
                      : "border-rose-300/50 text-rose-500 hover:border-rose-400 hover:bg-rose-50",
                  )}
                >
                  {statusLabel(b)}
                </button>
              </form>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
