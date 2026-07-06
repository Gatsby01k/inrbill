import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updatePartnerOps } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";
import { CheckboxGrid, Field, FormError, KV, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { directionLabel, fmtDate } from "@/lib/format";
import { BANK_OPTIONS, CAPACITY_BANDS, METHOD_OPTIONS, RESERVE_BANDS } from "@/lib/options";

export const metadata: Metadata = { title: "Profile & capacity" };

export default async function PartnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PARTNER");
  if (!user.partner) redirect("/login");
  const { error } = await searchParams;

  const partner = await db.partnerProfile.findUnique({ where: { id: user.partner.id } });
  if (!partner) redirect("/login");

  return (
    <>
      <PageHeader
        title="Profile & capacity"
        sub="Identity is fixed at application; operational capacity is yours to keep current."
      />

      {error ? (
        <div className="mb-5">
          <FormError message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Operational capacity" />
            <form action={updatePartnerOps} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Daily capacity">
                  <select
                    name="dailyCapacityBand"
                    defaultValue={partner.dailyCapacityBand}
                    className="input"
                  >
                    {CAPACITY_BANDS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reserve available">
                  <select name="reserveBand" defaultValue={partner.reserveBand} className="input">
                    {RESERVE_BANDS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Working hours" className="sm:col-span-2">
                  <input
                    name="workingHours"
                    defaultValue={partner.workingHours}
                    className="input"
                    placeholder="Hours + days + timezone"
                  />
                </Field>
              </div>
              <Field label="Supported banks">
                <CheckboxGrid name="banks" options={BANK_OPTIONS} defaultChecked={partner.banks} cols={3} />
              </Field>
              <Field label="Methods / rails">
                <CheckboxGrid
                  name="methods"
                  options={METHOD_OPTIONS}
                  defaultChecked={partner.methods}
                  cols={3}
                />
              </Field>
              <div className="flex items-center justify-between gap-4">
                <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                  Changes are recorded in the audit trail and visible to operations.
                  Material changes can trigger a re-review of your verification.
                </p>
                <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <SectionTitle title="Identity" />
            <dl className="space-y-3">
              <KV label="Operating name">{partner.displayName}</KV>
              <KV label="Legal entity">{partner.legalName ?? "Not provided"}</KV>
              <KV label="Reference">
                <span className="font-mono text-emerald-300">{partner.reference}</span>
              </KV>
              <KV label="Status">
                <StatusBadge status={partner.status} />
              </KV>
              <KV label="Experience">{partner.experienceBand}</KV>
              <KV label="Directions">
                {partner.directions.map((d) => directionLabel(d)).join(", ")}
              </KV>
              <KV label="Coverage">{partner.jurisdictions}</KV>
              <KV label="Applied">{fmtDate(partner.createdAt)}</KV>
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
              To change identity fields (name, legal entity, directions, coverage),
              message operations from your overview — identity changes require re-verification.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
