// Read-only, parameterized query functions exposed to the AI ops copilot as
// tool-use "tools". This is the entire trust boundary for the copilot: the
// model can only ever call one of the functions below, with the arguments
// it declares — never raw SQL, never a write, never a field outside what
// each function explicitly selects. None of these touch password hashes,
// session tokens, 2FA secrets, or raw uploaded document URLs.

import { db } from "@/lib/db";
import { getPartnerTrackRecord } from "@/lib/reputation";

const MAX_ROWS = 25;

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function str(input: Record<string, unknown> | undefined, key: string): string {
  const v = input?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function num(input: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const v = input?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export const AI_TOOLS = [
  {
    name: "list_requests",
    description:
      "List liquidity requests, optionally filtered by status and/or how many days since their last update. Use for questions like 'which requests are stuck' or 'show recent submissions'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["SUBMITTED", "IN_REVIEW", "MATCHING", "INTRODUCED", "CLOSED", "REJECTED"],
          description: "Filter by request status. Omit to include all statuses.",
        },
        staleDays: {
          type: "number",
          description: "Only include requests not updated in at least this many days.",
        },
        limit: { type: "number", description: "Max rows to return, default 20, max 25." },
      },
    },
  },
  {
    name: "get_request_detail",
    description:
      "Get full detail for a single liquidity request by its reference (e.g. REQ-0042) — matches, introductions, and revenue records.",
    input_schema: {
      type: "object",
      properties: { reference: { type: "string", description: "Request reference, e.g. REQ-0042" } },
      required: ["reference"],
    },
  },
  {
    name: "list_partners",
    description: "List partner profiles, optionally filtered by verification status.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["APPLIED", "UNDER_REVIEW", "VERIFIED", "LIMITED", "REJECTED", "SUSPENDED"],
        },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "partner_track_record",
    description:
      "Get a partner's introduction track record (success rate, average response time) plus basic profile facts, by partner reference or (partial) display name.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Partner reference (e.g. PTR-0003) or name." } },
      required: ["query"],
    },
  },
  {
    name: "revenue_summary",
    description:
      "Aggregate revenue totals over a recent period, broken out by currency (never summed across currencies) and optionally grouped by month or status. Use for 'how much did we make' questions.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: { type: "number", description: "How many days back to look, default 90." },
        groupBy: { type: "string", enum: ["month", "status", "none"], description: "Default none." },
      },
    },
  },
  {
    name: "stale_introductions",
    description:
      "List introductions that were sent but have had no reply/activity in at least N days — use for questions about deals going quiet.",
    input_schema: {
      type: "object",
      properties: { minDaysStale: { type: "number", description: "Default 2." } },
    },
  },
  {
    name: "platform_overview",
    description:
      "High-level counts across the whole platform: requests by status, partners by status, matches by status, revenue this month vs last month per currency. Use for general 'how are we doing' questions.",
    input_schema: { type: "object", properties: {} },
  },
] as const;

export async function runAiTool(name: string, rawInput: unknown): Promise<unknown> {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Record<string, unknown>;

  switch (name) {
    case "list_requests": {
      const limit = Math.min(num(input, "limit", 20), MAX_ROWS);
      const status = str(input, "status");
      const staleDays = input.staleDays;
      const rows = await db.liquidityRequest.findMany({
        where: status ? { status: status as never } : undefined,
        include: { company: { select: { companyName: true } } },
        orderBy: { updatedAt: "desc" },
        take: limit * 3,
      });
      const filtered = rows
        .map((r) => ({
          reference: r.reference,
          company: r.company.companyName,
          status: r.status,
          direction: r.direction,
          dailyVolumeBand: r.dailyVolumeBand,
          daysSinceUpdate: daysSince(r.updatedAt),
        }))
        .filter((r) => (typeof staleDays === "number" ? r.daysSinceUpdate >= staleDays : true))
        .slice(0, limit);
      return { count: filtered.length, requests: filtered };
    }

    case "get_request_detail": {
      const reference = str(input, "reference");
      if (!reference) return { error: "reference is required" };
      const r = await db.liquidityRequest.findUnique({
        where: { reference },
        include: {
          company: { select: { companyName: true, jurisdiction: true } },
          matches: {
            include: {
              partner: { select: { displayName: true, reference: true } },
              introductions: { select: { status: true, sentAt: true } },
            },
          },
          revenues: { select: { amount: true, currency: true, status: true, type: true } },
        },
      });
      if (!r) return { error: `No request found with reference ${reference}` };
      return {
        reference: r.reference,
        company: r.company.companyName,
        status: r.status,
        direction: r.direction,
        dailyVolumeBand: r.dailyVolumeBand,
        monthlyVolumeBand: r.monthlyVolumeBand,
        jurisdiction: r.jurisdiction,
        createdAt: r.createdAt.toISOString(),
        matches: r.matches.map((m) => ({
          partner: m.partner.displayName,
          partnerReference: m.partner.reference,
          status: m.status,
          released: m.releasedToCompany && m.releasedToPartner,
          introductions: m.introductions.map((i) => ({
            status: i.status,
            sentAt: i.sentAt ? i.sentAt.toISOString() : null,
          })),
        })),
        revenue: r.revenues.map((rv) => ({
          amount: rv.amount.toString(),
          currency: rv.currency,
          status: rv.status,
          type: rv.type,
        })),
      };
    }

    case "list_partners": {
      const limit = Math.min(num(input, "limit", 20), MAX_ROWS);
      const status = str(input, "status");
      const rows = await db.partnerProfile.findMany({
        where: status ? { status: status as never } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          reference: true,
          displayName: true,
          status: true,
          dailyCapacityBand: true,
          jurisdictions: true,
          createdAt: true,
        },
      });
      return {
        count: rows.length,
        partners: rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
      };
    }

    case "partner_track_record": {
      const query = str(input, "query");
      if (!query) return { error: "query is required" };
      const partner = await db.partnerProfile.findFirst({
        where: {
          OR: [
            { reference: { equals: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          reference: true,
          displayName: true,
          status: true,
          dailyCapacityBand: true,
          jurisdictions: true,
        },
      });
      if (!partner) return { error: `No partner found matching "${query}"` };
      const trackRecord = await getPartnerTrackRecord(partner.id);
      return { partner: { ...partner, id: undefined }, trackRecord };
    }

    case "revenue_summary": {
      const sinceDays = num(input, "sinceDays", 90);
      const groupBy = str(input, "groupBy") || "none";
      const since = new Date(Date.now() - sinceDays * 86_400_000);
      const rows = await db.revenueRecord.findMany({
        where: { createdAt: { gte: since } },
        select: { amount: true, currency: true, status: true, createdAt: true },
      });
      const totals: Record<string, number> = {};
      for (const r of rows) {
        const base =
          groupBy === "month" ? r.createdAt.toISOString().slice(0, 7) : groupBy === "status" ? r.status : "total";
        const key = `${base} (${r.currency})`;
        totals[key] = (totals[key] ?? 0) + Number(r.amount);
      }
      return { sinceDays, recordCount: rows.length, totalsByCurrency: totals };
    }

    case "stale_introductions": {
      const minDaysStale = num(input, "minDaysStale", 2);
      const cutoff = new Date(Date.now() - minDaysStale * 86_400_000);
      const rows = await db.introduction.findMany({
        where: { status: "SENT", sentAt: { lte: cutoff } },
        include: {
          match: {
            include: {
              request: { select: { reference: true } },
              partner: { select: { displayName: true } },
            },
          },
        },
        take: MAX_ROWS,
      });
      return {
        count: rows.length,
        introductions: rows.map((i) => ({
          request: i.match.request.reference,
          partner: i.match.partner.displayName,
          daysSinceSent: i.sentAt ? daysSince(i.sentAt) : null,
        })),
      };
    }

    case "platform_overview": {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [requestsByStatus, partnersByStatus, matchesByStatus, revenueThisMonth, revenueLastMonth] =
        await Promise.all([
          db.liquidityRequest.groupBy({ by: ["status"], _count: true }),
          db.partnerProfile.groupBy({ by: ["status"], _count: true }),
          db.match.groupBy({ by: ["status"], _count: true }),
          db.revenueRecord.groupBy({ by: ["currency"], _sum: { amount: true }, where: { createdAt: { gte: startOfThisMonth } } }),
          db.revenueRecord.groupBy({
            by: ["currency"],
            _sum: { amount: true },
            where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
          }),
        ]);

      return {
        requestsByStatus: Object.fromEntries(requestsByStatus.map((r) => [r.status, r._count])),
        partnersByStatus: Object.fromEntries(partnersByStatus.map((r) => [r.status, r._count])),
        matchesByStatus: Object.fromEntries(matchesByStatus.map((r) => [r.status, r._count])),
        revenueThisMonthByCurrency: Object.fromEntries(
          revenueThisMonth.map((r) => [r.currency, r._sum.amount?.toString() ?? "0"]),
        ),
        revenueLastMonthByCurrency: Object.fromEntries(
          revenueLastMonth.map((r) => [r.currency, r._sum.amount?.toString() ?? "0"]),
        ),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
