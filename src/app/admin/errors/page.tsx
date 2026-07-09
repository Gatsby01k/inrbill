import type { Metadata } from "next";
import Link from "next/link";
import { reopenError, resolveError } from "@/app/actions/errors";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Errors" };

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showResolved = show === "resolved";

  const [openCount, resolvedCount, errors] = await Promise.all([
    db.errorLog.count({ where: { resolved: false } }),
    db.errorLog.count({ where: { resolved: true } }),
    db.errorLog.findMany({
      where: { resolved: showResolved },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Errors"
        sub="Native substitute for Sentry — unhandled exceptions from route handlers, server actions and the client error boundary land here. WARNING/ERROR/FATAL also push to the ops Telegram chat."
        actions={
          <div className="flex gap-1.5 text-xs font-medium">
            <Link
              href="/admin/errors"
              className={`btn btn-sm ${!showResolved ? "btn-gold" : "btn-ghost"}`}
            >
              Open ({openCount})
            </Link>
            <Link
              href="/admin/errors?show=resolved"
              className={`btn btn-sm ${showResolved ? "btn-gold" : "btn-ghost"}`}
            >
              Resolved ({resolvedCount})
            </Link>
          </div>
        }
      />

      <div className="card overflow-hidden">
        {errors.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Message</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {fmtDateTime(e.createdAt)}
                    </td>
                    <td>
                      <StatusBadge status={e.severity} />
                    </td>
                    <td className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {e.source}
                    </td>
                    <td className="max-w-[480px] truncate text-[13px] text-slate-800" title={e.message}>
                      {e.message}
                      {e.url ? (
                        <span className="ml-2 font-mono text-[11px] text-slate-400">{e.url}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap">
                      {showResolved ? (
                        <form action={reopenError}>
                          <input type="hidden" name="id" value={e.id} />
                          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Reopening…">
                            Reopen
                          </SubmitButton>
                        </form>
                      ) : (
                        <form action={resolveError}>
                          <input type="hidden" name="id" value={e.id} />
                          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Resolving…">
                            Mark resolved
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title={showResolved ? "No resolved errors" : "No open errors"}
              body={
                showResolved
                  ? "Nothing has been marked resolved yet."
                  : "Nothing unhandled has been caught since this went live — that's the goal."
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
