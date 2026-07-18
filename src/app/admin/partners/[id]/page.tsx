import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDocument, addNote, updatePartnerStatus } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, EmptyState, FormError, KV, SectionTitle, StatusBadge } from "@/components/ui";
import { AiPartnerBriefingCard } from "@/components/workspace/ai-briefing";
import {
  DocumentComposer,
  DocumentList,
  NoteComposer,
  NoteList,
} from "@/components/workspace/records";
import { Timeline } from "@/components/workspace/timeline";
import { TrackRecordCard } from "@/components/workspace/track-record";
import { db } from "@/lib/db";
import { auditLabel, directionLabel, fmtDate, statusLabel } from "@/lib/format";
import { COMPLIANCE_FLAG_OPTIONS, PARTNER_STATUSES } from "@/lib/options";
import { getPartnerTrackRecord } from "@/lib/reputation";

export const metadata: Metadata = { title: "Partner detail" };

const ADMIN_NOTE_VISIBILITY = [
  { value: "INTERNAL", label: "Internal only" },
  { value: "PARTNER", label: "Share with partner" },
];

export default async function AdminPartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const partner = await db.partnerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      matches: {
        include: { request: { include: { company: true } } },
        orderBy: { createdAt: "desc" },
      },
      notesList: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      verificationCases: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, reference: true, status: true, expiresAt: true },
      },
    },
  });
  if (!partner) notFound();

  const [timeline, trackRecord] = await Promise.all([
    db.auditLog.findMany({
      where: { partnerId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getPartnerTrackRecord(id),
  ]);

  const back = `/admin/partners/${id}`;

  return (
    <>
      <BackLink href="/admin/partners" label="All partners" />

      <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-leaf-700">{partner.reference}</span>
        <h1 className="text-xl font-semibold text-slate-900">{partner.displayName}</h1>
        <StatusBadge status={partner.status} />
        <span className="text-xs text-slate-500">
          applied {fmtDate(partner.createdAt)}
          {partner.verifiedAt ? ` · verified ${fmtDate(partner.verifiedAt)}` : ""}
        </span>
      </div>

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-5">
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Operating profile" />
            <dl className="kv grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
              <KV label="Legal entity">{partner.legalName ?? "Not provided"}</KV>
              <KV label="Operating country">{partner.operatingCountry ?? "Not provided"}</KV>
              <KV label="Experience">{partner.experienceBand}</KV>
              <KV label="Daily capacity">{partner.dailyCapacityBand}</KV>
              <KV label="Monthly capacity">{partner.monthlyCapacityBand ?? "Not provided"}</KV>
              <KV label="Ticket range">
                {partner.minTicket || partner.maxTicket
                  ? `${partner.minTicket ?? "—"} to ${partner.maxTicket ?? "—"}`
                  : "Not provided"}
              </KV>
              <KV label="Reserve available">{partner.reserveBand}</KV>
              <KV label="Working hours">{partner.workingHours}</KV>
              <KV label="Coverage">{partner.jurisdictions}</KV>
              <KV label="Settlement preference">{partner.settlementPreference ?? "Not provided"}</KV>
            </dl>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Directions</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {partner.directions.map((d) => (
                    <span key={d} className="chip border-gold-500/30 bg-gold-500/[0.06] text-gold-700">
                      {directionLabel(d)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Banks</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {partner.banks.map((b) => (
                    <span key={b} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Methods</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {partner.methods.map((m) => (
                    <span key={m} className="chip border-black/10 bg-black/[0.03] text-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <SectionTitle title="Compliance readiness" />
            <ul className="grid gap-2 sm:grid-cols-2">
              {COMPLIANCE_FLAG_OPTIONS.map((flag) => {
                const has = partner.complianceFlags.includes(flag);
                return (
                  <li
                    key={flag}
                    className={
                      has
                        ? "flex items-center gap-2.5 rounded-lg border border-leaf-400/25 bg-leaf-400/[0.06] px-3 py-2.5 text-sm text-leaf-800"
                        : "flex items-center gap-2.5 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5 text-sm text-slate-500"
                    }
                  >
                    <span aria-hidden>{has ? "✓" : "—"}</span>
                    {flag}
                  </li>
                );
              })}
            </ul>
            {partner.complianceNotes ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-black/[0.03] px-4 py-3 text-sm text-slate-600">
                {partner.complianceNotes}
              </p>
            ) : null}
            {partner.references ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">References</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{partner.references}</p>
              </div>
            ) : null}
            {partner.riskNotes ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">Risk notes</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {partner.riskNotes}
                </p>
              </div>
            ) : null}
            {partner.additionalComments ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Additional comments
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {partner.additionalComments}
                </p>
              </div>
            ) : null}
          </div>

          <div className="card p-5 sm:p-6">
            <SectionTitle title={`Matches · ${partner.matches.length}`} />
            {partner.matches.length ? (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Company</th>
                      <th>Direction</th>
                      <th>Match status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.matches.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link
                            href={`/admin/requests/${m.requestId}`}
                            className="font-mono text-xs text-gold-700 hover:underline"
                          >
                            {m.request.reference}
                          </Link>
                        </td>
                        <td className="font-medium text-slate-800">
                          {m.request.company.companyName}
                        </td>
                        <td className="text-xs">{directionLabel(m.request.direction)}</td>
                        <td>
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="whitespace-nowrap text-xs text-slate-500">
                          {fmtDate(m.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No matches yet"
                body="Matches are created from a request's detail page once this partner is verified."
              />
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <SectionTitle title="Notes" />
            <div className="mb-4">
              <NoteComposer
                action={addNote}
                hidden={{ partnerId: partner.id, back }}
                visibilityOptions={ADMIN_NOTE_VISIBILITY}
              />
            </div>
            <NoteList notes={partner.notesList} showVisibility />
          </div>

          <div className="card p-5 sm:p-6">
            <SectionTitle title="Documents" />
            <div className="mb-4">
              <DocumentComposer
                action={addDocument}
                hidden={{ partnerId: partner.id, back }}
                visibilityOptions={ADMIN_NOTE_VISIBILITY}
              />
            </div>
            <DocumentList documents={partner.documents} showVisibility />
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-5 xl:sticky xl:top-7 xl:self-start">
          <AiPartnerBriefingCard
            partnerId={partner.id}
            initialNote={partner.aiTriageNote}
            initialFlagged={partner.aiFlagged}
          />

          <div className="card p-5">
            <TrackRecordCard record={trackRecord} title="Track record" />
          </div>

          <div className="card p-5">
            <SectionTitle title="Verification status" />
            {partner.verificationCases[0] ? (
              <Link href={`/admin/reviews/${partner.verificationCases[0].id}`} className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.045] p-3 transition-colors hover:border-gold-500/40">
                <span className="min-w-0"><strong className="block truncate font-mono text-[11px] text-gold-700">{partner.verificationCases[0].reference}</strong><small className="mt-0.5 block text-[11px] text-slate-500">Open evidence review</small></span>
                <StatusBadge status={partner.verificationCases[0].status} />
              </Link>
            ) : null}
            <form action={updatePartnerStatus} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="back" value={back} />
              <select name="status" defaultValue={partner.status} className="input h-9 py-0 text-sm">
                {PARTNER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn btn-gold btn-sm" pendingLabel="…">
                Update
              </SubmitButton>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              Verified requires an approved Trust Passport. Open the evidence review above to approve the case and status together. Limited and suspension remain available here for audited operational overrides.
            </p>
          </div>

          <div className="card p-5">
            <SectionTitle title="Contact" />
            <dl className="space-y-3">
              <KV label="Contact">{partner.contactName}</KV>
              <KV label="Email">
                <a href={`mailto:${partner.user.email}`} className="text-gold-600 hover:underline">
                  {partner.user.email}
                </a>
              </KV>
              {partner.telegram ? <KV label="Telegram">{partner.telegram}</KV> : null}
              {partner.phone ? <KV label="Phone">{partner.phone}</KV> : null}
            </dl>
          </div>

          <div className="card p-5">
            <SectionTitle title="Timeline" />
            <Timeline
              items={timeline.map((a) => ({
                id: a.id,
                when: a.createdAt,
                label: auditLabel(a.action, a.meta),
                actor: a.actorLabel,
              }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
