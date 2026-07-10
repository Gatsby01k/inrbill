// Deterministic duplicate/self-dealing detection — deliberately NOT an LLM
// call. Cross-referencing exact contact fields across every company and
// partner is a plain grouping problem; a model would be slower, cost money,
// and could hallucinate a match that isn't really there. This is the kind
// of check that has to be exactly right or not claimed at all.
//
// What it catches: the same Telegram handle or phone number showing up on
// more than one account. Two flavors matter differently:
//   - "same_side": two companies (or two partners) sharing a contact — could
//     be one operator running multiple accounts to route around a rejected
//     application, get multiple free reviews, etc.
//   - "cross_side": a company contact and a partner contact share the same
//     Telegram/phone — the same person could be on both ends of a deal
//     they're being matched into, which is a real conflict-of-interest risk
//     for a matching platform to wave through unnoticed.
//
// No new schema needed — this reads fields that already exist.

import { db } from "@/lib/db";

export type DuplicateEntity = { kind: "company" | "partner"; id: string; label: string; href: string };
export type DuplicateGroup = {
  field: "telegram" | "phone";
  value: string;
  severity: "cross_side" | "same_side";
  entities: DuplicateEntity[];
};

function normalizeTelegram(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase().replace(/^@/, "");
  return t.length >= 3 ? t : null;
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  // Drop a leading country/trunk digit run so "+91 98765 43210" and
  // "9876543210" still collide — compare on the last 10 digits, which is
  // the actual subscriber number for Indian mobile numbers.
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Scans every company and partner contact field for exact-match overlaps.
    Cheap enough to run on every admin/risk page load at this data volume —
    two flat queries, no join, no N+1. */
export async function findDuplicateContactGroups(): Promise<DuplicateGroup[]> {
  const [companies, partners] = await Promise.all([
    db.companyProfile.findMany({
      select: { id: true, companyName: true, telegram: true, phone: true },
    }),
    db.partnerProfile.findMany({
      select: { id: true, displayName: true, telegram: true, phone: true },
    }),
  ]);

  const entities: (DuplicateEntity & { telegram: string | null; phone: string | null })[] = [
    ...companies.map((c) => ({
      kind: "company" as const,
      id: c.id,
      label: c.companyName,
      href: `/admin/requests?q=${encodeURIComponent(c.companyName)}`,
      telegram: normalizeTelegram(c.telegram),
      phone: normalizePhone(c.phone),
    })),
    ...partners.map((p) => ({
      kind: "partner" as const,
      id: p.id,
      label: p.displayName,
      href: `/admin/partners/${p.id}`,
      telegram: normalizeTelegram(p.telegram),
      phone: normalizePhone(p.phone),
    })),
  ];

  const groups: DuplicateGroup[] = [];

  for (const field of ["telegram", "phone"] as const) {
    const byValue = new Map<string, typeof entities>();
    for (const e of entities) {
      const v = e[field];
      if (!v) continue;
      const bucket = byValue.get(v) ?? [];
      bucket.push(e);
      byValue.set(v, bucket);
    }
    for (const [value, group] of byValue) {
      if (group.length < 2) continue;
      const kinds = new Set(group.map((g) => g.kind));
      groups.push({
        field,
        value,
        severity: kinds.size > 1 ? "cross_side" : "same_side",
        entities: group.map(({ kind, id, label, href }) => ({ kind, id, label, href })),
      });
    }
  }

  // Cross-side conflicts first — they're the ones that actually matter most
  // to catch before a match ships, not just before someone re-applies.
  groups.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "cross_side" ? -1 : 1));
  return groups;
}

/** Stable identity for a group, independent of member order — used both to
    key React lists and as the dedup key for "have we already alerted ops
    about this exact pair" in the watchdog. */
export function groupKey(group: DuplicateGroup): string {
  const ids = group.entities.map((e) => `${e.kind}:${e.id}`).sort().join("+");
  return `${group.field}:${ids}`;
}
