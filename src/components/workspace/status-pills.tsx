import { cn, statusLabel } from "@/lib/format";

/**
 * One-click status changer — replaces the old <select> + "Set" button
 * pattern everywhere a status enum needs changing (request/match/
 * introduction/revenue). Each option is its own tiny zero-JS form; clicking
 * a pill submits that value directly. The current value renders filled and
 * inert — a status readout and a one-click switcher in the same control.
 */
export function StatusPills<T extends string>({
  action,
  hidden,
  statusField = "status",
  options,
  current,
  labels,
  tone = "neutral",
  size = "sm",
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
  statusField?: string;
  options: readonly T[];
  current: T;
  labels?: Partial<Record<T, string>>;
  tone?: "neutral" | "danger";
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isCurrent = opt === current;
        const isDanger = tone === "danger" && opt === options[options.length - 1];
        return (
          <form key={opt} action={action} className="contents">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input type="hidden" name={statusField} value={opt} />
            <button
              type="submit"
              disabled={isCurrent}
              className={cn(
                "pill",
                size === "lg" && "px-3.5 py-2 text-[12.5px] font-semibold",
                isCurrent && !isDanger && "pill-active pointer-events-none",
                isCurrent && isDanger && "pointer-events-none border-rose-500/50 bg-rose-500/[0.1] text-rose-700",
                !isCurrent && isDanger && "border-rose-300/60 text-rose-500 hover:border-rose-400 hover:text-rose-600",
              )}
            >
              {labels?.[opt] ?? statusLabel(opt)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
