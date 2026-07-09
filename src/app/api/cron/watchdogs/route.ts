import { NextResponse, type NextRequest } from "next/server";
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
    runSlaWatchdog().catch((err) => {
      console.error("runSlaWatchdog failed", err);
      return { checked: 0, sent: 0, error: true };
    }),
    runRevenueOverdueWatchdog().catch((err) => {
      console.error("runRevenueOverdueWatchdog failed", err);
      return { checked: 0, sent: 0, error: true };
    }),
    runFollowUpWatchdog().catch((err) => {
      console.error("runFollowUpWatchdog failed", err);
      return { checked: 0, sent: 0, error: true };
    }),
    runRevenueUninvoicedWatchdog().catch((err) => {
      console.error("runRevenueUninvoicedWatchdog failed", err);
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
