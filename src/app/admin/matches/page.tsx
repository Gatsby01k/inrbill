import type { Metadata } from "next";
import Link from "next/link";
import type { MatchStatus } from "@prisma/client";
import { bulkApproveAndIntroduce, bulkDeclineMatches } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, FormError, PageHeader, StatusBadge } from "@/components/ui";
import { SelectAllCheckbox } from "@/components/workspace/select-all-checkbox";
import { db } from "@/lib/db";
import { cn, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { MATCH_STATUSES } from "@/lib/options";

const BULK_ELIGIBLE_STATUSES = new Set<MatchStatus>(["SUGGESTED", "SHORTLISTED"]);
const BULK_FORM_ID = "bulk-match-actions";

export const metadata: Metadata = { title: "Matches" };

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { status, error } = await searchParams;
  const statusFilter = (MATCH_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as MatchStatus)
    : undefined;
  const back = `/admin/matches${statusFilter ? `?status=${statusFilter}` : ""}`;

  const matches = await db.match.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      request: { include: { company: true } },
      partner: true,
      _count: { select: { introductions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Matches"
        sub="Every request–partner pairing across the pipeline. Manage each match from its request."
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/matches" className={cn("pill", !statusFilter && "pill-active")}>
          All
        </Link>
        {MATCH_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/matches?status=${s}`}
            className={cn("pill", statusFilter === s && "pill-active")}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {matches.length ? (
          <form id={BULK_FORM_ID} action={bulkApproveAndIntroduce}>
            <input type="hidden" name="back" value={back} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-black/[0.02] px-4 py-2.5">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Check suggested/shortlisted rows to approve or decline several at once.
              </p>
              <div className="flex items-center gap-2">
                <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Approving…">
                  ⚡ Approve &amp; introduce selected
                </SubmitButton>
                <SubmitButton
                  className="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-500/10"
                  pendingLabel="Declining…"
                  formAction={bulkDeclineMatches}
                >
                  Decline selected
                </SubmitButton>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-8">
                      <SelectAllCheckbox formId={BULK_FORM_ID} name="matchIds" />
                    </th>
                    <th>Request</th>
                    <th>Company</th>
                    <th>Partner</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Next action</th>
                    <th>Released</th>
                    <th>Intros</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {BULK_ELIGIBLE_STATUSES.has(m.status) ? (
                          <input
                            type="checkbox"
                            name="matchIds"
                            value={m.id}
                            className="h-4 w-4 rounded border-black/20"
                          />
                        ) : null}
                      </td>
                      <td>
                        <Link
                          href={`/admin/requests/${m.requestId}`}
                          className="font-mono text-xs text-gold-700 hover:underline"
                        >
                          {m.request.reference}
                        </Link>
                      </td>
                      <td className="font-medium text-slate-800">{m.request.company.companyName}</td>
                      <td>
                        <Link
                          href={`/admin/partners/${m.partnerId}`}
                          className="font-medium text-slate-800 hover:text-leaf-800"
                        >
                          {m.partner.displayName}
                        </Link>
                      </td>
                      <td className="text-xs">{directionLabel(m.request.direction)}</td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="tabular-nums text-xs">
                        {m.confidenceScore != null ? `${m.confidenceScore}/100` : "—"}
                      </td>
                      <td className="max-w-40 truncate text-xs" title={m.nextAction ?? ""}>
                        {m.nextAction ?? "—"}
                      </td>
                      <td className="text-xs">
                        <span className={m.releasedToCompany ? "text-leaf-700" : "text-slate-400"}>
                          C{m.releasedToCompany ? " ✓" : " —"}
                        </span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className={m.releasedToPartner ? "text-leaf-700" : "text-slate-400"}>
                          P{m.releasedToPartner ? " ✓" : " —"}
                        </span>
                      </td>
                      <td className="tabular-nums">{m._count.introductions}</td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <EmptyState
              title={statusFilter ? "No matches with this status" : "No matches created yet"}
              body="Review company requests and verified partners to create a qualified introduction — matches you create appear here across the whole pipeline."
            />
          </div>
        )}
      </div>
    </>
  );
}
