import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/error-log";
import {
  runFollowUpWatchdog,
  runRevenueOverdueWatchdog,
  runRevenueUninvoicedWatchdog,
  runSlaWatchdog,
} from "@/lib/watchdogs";

// Vercel Cron hits this on schedule (see vercel.json). Protected by
// CRON_SECRET so it can't be triggered by anyone who finds the URL — Vercel
// automatically sends `Authorization: Bearer $CRON_SECRET` on cron-invoked
// requests when that env var is set.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [sla, revenue, followUp, uninvoiced] = await Promise.all([
    runSlaWatchdog().catch(async (err) => {
      await logError({ error: err, source: "cron:runSlaWatchdog", severity: "ERROR" });
      return { checked: 0, sent: 0, error: true };
    }),
    runRevenueOverdueWatchdog().catch(async (err) => {
      await logError({ error: err, source: "cron:runRevenueOverdueWatchdog", severity: "ERROR" });
      return { checked: 0, sent: 0, error: true };
    }),
    runFollowUpWatchdog().catch(async (err) => {
      await logError({ error: err, source: "cron:runFollowUpWatchdog", severity: "ERROR" });
      return { checked: 0, sent: 0, error: true };
    }),
    runRevenueUninvoicedWatchdog().catch(async (err) => {
      await logError({ error: err, source: "cron:runRevenueUninvoicedWatchdog", severity: "ERROR" });
      return { checked: 0, sent: 0, error: true };
    }),
  ]);

  return NextResponse.json({
    ok: true,
    sla,
    revenue,
    followUp,
    uninvoiced,
    ranAt: new Date().toISOString(),
  });
}
