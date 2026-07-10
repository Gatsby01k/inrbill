import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { findDuplicateContactGroups, groupKey } from "@/lib/risk-radar";

export const metadata: Metadata = { title: "Risk radar" };

export default async function AdminRiskPage() {
  const groups = await findDuplicateContactGroups();
  const crossSide = groups.filter((g) => g.severity === "cross_side");
  const sameSide = groups.filter((g) => g.severity === "same_side");

  return (
    <>
      <PageHeader
        title="Risk radar"
        sub="Companies and partners sharing a Telegram handle or phone number — computed live, nothing stored. The same checks run daily and alert ops on Telegram the first time a pair is spotted."
      />

      {groups.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            title="Nothing to flag"
            body="No shared contact details across companies or partners right now."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {crossSide.length ? (
            <div className="card p-5">
              <SectionTitle
                title={`Same contact on both sides · ${crossSide.length}`}
                action={<span className="text-[11px] text-rose-600">Higher priority</span>}
              />
              <p className="mb-4 text-[12.5px] leading-relaxed text-slate-500">
                One Telegram handle or phone number appears on both a company and a partner account — the same
                person could end up on both ends of a match. Worth checking before releasing anything between
                these accounts.
              </p>
              <GroupList groups={crossSide} />
            </div>
          ) : null}

          {sameSide.length ? (
            <div className="card p-5">
              <SectionTitle title={`Duplicate accounts, same side · ${sameSide.length}`} />
              <p className="mb-4 text-[12.5px] leading-relaxed text-slate-500">
                Two companies (or two partners) sharing a contact detail — could be one operator running
                multiple accounts.
              </p>
              <GroupList groups={sameSide} />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function GroupList({ groups }: { groups: Awaited<ReturnType<typeof findDuplicateContactGroups>> }) {
  return (
    <ul className="divide-y divide-black/[0.06]">
      {groups.map((group) => (
        <li key={groupKey(group)} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {group.entities.map((e, i) => (
              <span key={`${e.kind}:${e.id}`} className="flex items-center gap-2">
                {i > 0 ? <span className="text-slate-300">↔</span> : null}
                <Link
                  href={e.href}
                  className={
                    e.kind === "company"
                      ? "chip border-gold-500/30 bg-gold-500/[0.06] text-gold-700 hover:underline"
                      : "chip border-leaf-400/30 bg-leaf-400/[0.06] text-leaf-700 hover:underline"
                  }
                >
                  {e.kind === "company" ? "Company" : "Partner"} · {e.label}
                </Link>
              </span>
            ))}
          </div>
          <span className="whitespace-nowrap text-xs text-slate-400">
            same {group.field} · {group.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
