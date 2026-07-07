import { EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export type TimelineItem = {
  id: string;
  when: Date;
  label: string;
  actor?: string;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return (
      <EmptyState title="No activity yet" body="Events will appear here as the record moves." />
    );
  }
  return (
    <ol className="relative space-y-[18px] border-l border-white/[0.08] pl-5">
      {items.map((e, i) => (
        <li key={e.id} className="relative">
          <span
            className={
              i === 0
                ? "absolute -left-[24.5px] top-[5px] h-2 w-2 rounded-full bg-gold-400 ring-4 ring-gold-400/15"
                : "absolute -left-[23.5px] top-[6px] h-1.5 w-1.5 rounded-full bg-slate-600"
            }
          />
          <p className="text-[12.5px] leading-snug text-slate-300">{e.label}</p>
          <p className="tnum mt-0.5 font-mono text-[10.5px] tracking-tight text-slate-600">
            {e.actor ? `${e.actor} · ` : ""}
            {fmtDateTime(e.when)}
          </p>
        </li>
      ))}
    </ol>
  );
}
