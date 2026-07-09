import { db } from "@/lib/db";

// Partner trust signal — turns data that already existed (Introduction.status,
// sentAt/respondedAt) into a track record surfaced to companies (does this
// partner actually deliver?), to the partner themselves (a motivational
// reason to respond fast and close well), and to operations (a real signal
// alongside the manual verification badge). Nothing here is stored — it's
// computed fresh from the Introduction history every time it's read, so it's
// always consistent with the audit trail and never drifts out of sync.

export type PartnerTrackRecord = {
  totalIntroductions: number;
  successfulIntroductions: number;
  failedIntroductions: number;
  successRate: number | null; // 0–100, null if no introductions have concluded yet
  avgResponseHours: number | null; // null if nothing has ever been responded to yet
};

const CONCLUDED_STATUSES = ["SUCCESSFUL", "FAILED"] as const;

export async function getPartnerTrackRecord(partnerId: string): Promise<PartnerTrackRecord> {
  const introductions = await db.introduction.findMany({
    where: { match: { partnerId } },
    select: { status: true, sentAt: true, respondedAt: true },
  });

  const concluded = introductions.filter((i) =>
    (CONCLUDED_STATUSES as readonly string[]).includes(i.status),
  );
  const successful = introductions.filter((i) => i.status === "SUCCESSFUL").length;
  const failed = introductions.filter((i) => i.status === "FAILED").length;

  const responseSamples = introductions
    .filter((i): i is typeof i & { sentAt: Date; respondedAt: Date } => !!i.sentAt && !!i.respondedAt)
    .map((i) => (i.respondedAt.getTime() - i.sentAt.getTime()) / 3_600_000)
    .filter((h) => h >= 0);

  return {
    totalIntroductions: introductions.length,
    successfulIntroductions: successful,
    failedIntroductions: failed,
    successRate: concluded.length > 0 ? Math.round((successful / concluded.length) * 100) : null,
    avgResponseHours:
      responseSamples.length > 0
        ? responseSamples.reduce((a, b) => a + b, 0) / responseSamples.length
        : null,
  };
}

/** Bulk variant for list pages — one query instead of N. */
export async function getPartnerTrackRecords(
  partnerIds: string[],
): Promise<Map<string, PartnerTrackRecord>> {
  if (partnerIds.length === 0) return new Map();

  const introductions = await db.introduction.findMany({
    where: { match: { partnerId: { in: partnerIds } } },
    select: { status: true, sentAt: true, respondedAt: true, match: { select: { partnerId: true } } },
  });

  const byPartner = new Map<string, typeof introductions>();
  for (const intro of introductions) {
    const list = byPartner.get(intro.match.partnerId) ?? [];
    list.push(intro);
    byPartner.set(intro.match.partnerId, list);
  }

  const out = new Map<string, PartnerTrackRecord>();
  for (const partnerId of partnerIds) {
    const list = byPartner.get(partnerId) ?? [];
    const concluded = list.filter((i) => (CONCLUDED_STATUSES as readonly string[]).includes(i.status));
    const successful = list.filter((i) => i.status === "SUCCESSFUL").length;
    const failed = list.filter((i) => i.status === "FAILED").length;
    const responseSamples = list
      .filter((i): i is typeof i & { sentAt: Date; respondedAt: Date } => !!i.sentAt && !!i.respondedAt)
      .map((i) => (i.respondedAt.getTime() - i.sentAt.getTime()) / 3_600_000)
      .filter((h) => h >= 0);

    out.set(partnerId, {
      totalIntroductions: list.length,
      successfulIntroductions: successful,
      failedIntroductions: failed,
      successRate: concluded.length > 0 ? Math.round((successful / concluded.length) * 100) : null,
      avgResponseHours:
        responseSamples.length > 0
          ? responseSamples.reduce((a, b) => a + b, 0) / responseSamples.length
          : null,
    });
  }
  return out;
}

export function formatResponseTime(hours: number): string {
  if (hours < 1) return "under 1h";
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)}d`;
}
