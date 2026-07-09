import { Stat } from "@/components/ui";
import { formatResponseTime, type PartnerTrackRecord } from "@/lib/reputation";

/**
 * Compact trust signal for company-facing views (matched-partner cards,
 * deal room sidebar) — a glance at whether this partner actually delivers,
 * without exposing raw match/audit detail that belongs to operations only.
 */
export function TrackRecordBadge({ record }: { record: PartnerTrackRecord }) {
  if (record.totalIntroductions === 0) {
    return (
      <span className="chip border-black/10 bg-black/[0.03] text-slate-500">New to the network</span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {record.successfulIntroductions > 0 ? (
        <span className="chip border-leaf-400/30 bg-leaf-400/[0.08] text-leaf-700">
          ✓ {record.successfulIntroductions} successful intro
          {record.successfulIntroductions === 1 ? "" : "s"}
        </span>
      ) : null}
      {record.avgResponseHours !== null ? (
        <span className="chip border-black/10 bg-black/[0.03] text-slate-600">
          {formatResponseTime(record.avgResponseHours)} avg response
        </span>
      ) : null}
      {record.successfulIntroductions === 0 && record.avgResponseHours === null ? (
        <span className="chip border-black/10 bg-black/[0.03] text-slate-500">Building a track record</span>
      ) : null}
    </div>
  );
}

/**
 * Fuller stat-card version — used on the partner's own workspace (a
 * motivational "here's your record" widget) and on the admin partner detail
 * page (an operational signal alongside manual verification).
 */
export function TrackRecordCard({
  record,
  title = "Track record",
}: {
  record: PartnerTrackRecord;
  title?: string;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {record.totalIntroductions === 0 ? (
        <p className="text-[13px] leading-relaxed text-slate-500">
          No introductions yet — your track record builds automatically as introductions are made and
          closed out.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Successful intros"
            value={record.successfulIntroductions}
            tone={record.successfulIntroductions > 0 ? "emerald" : "default"}
          />
          <Stat
            label="Success rate"
            value={record.successRate !== null ? `${record.successRate}%` : "—"}
            tone={
              record.successRate !== null && record.successRate >= 60
                ? "emerald"
                : record.successRate !== null
                  ? "gold"
                  : "default"
            }
          />
          <Stat
            label="Avg response"
            value={record.avgResponseHours !== null ? formatResponseTime(record.avgResponseHours) : "—"}
          />
          <Stat label="Total introductions" value={record.totalIntroductions} />
        </div>
      )}
    </div>
  );
}
