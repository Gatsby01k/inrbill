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
    return <EmptyState title="No activity yet" body="Events will appear here as the record moves." />;
  }
  return (
    <ol className="space-y-4 border-l border-white/10 pl-5">
      {items.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full bg-gold-400/80 ring-4 ring-gold-400/10" />
          <p className="text-[13px] leading-snug text-slate-300">{e.label}</p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {e.actor ? `${e.actor} · ` : ""}
            {fmtDateTime(e.when)}
          </p>
        </li>
      ))}
    </ol>
  );
}
