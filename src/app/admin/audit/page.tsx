import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { auditLabel, fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  const events = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        sub="Immutable history of every state change across the network — last 200 events."
      />

      <div className="card overflow-hidden">
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Event</th>
                  <th>Action</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {fmtDateTime(e.createdAt)}
                    </td>
                    <td className="text-xs font-medium text-slate-700">{e.actorLabel}</td>
                    <td className="text-slate-800">{auditLabel(e.action, e.meta)}</td>
                    <td className="font-mono text-[11px] text-slate-400">{e.action}</td>
                    <td className="whitespace-nowrap text-xs">
                      {e.requestId ? (
                        <Link
                          href={`/admin/requests/${e.requestId}`}
                          className="text-gold-600 hover:underline"
                        >
                          request
                        </Link>
                      ) : null}
                      {e.requestId && e.partnerId ? <span className="text-slate-300"> · </span> : null}
                      {e.partnerId ? (
                        <Link
                          href={`/admin/partners/${e.partnerId}`}
                          className="text-leaf-600 hover:underline"
                        >
                          partner
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No events yet"
              body="Every submission, status change, match, introduction and fee is recorded here."
            />
          </div>
        )}
      </div>
    </>
  );
}
