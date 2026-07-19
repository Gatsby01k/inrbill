import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { generateReferralCode } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ReferralCard, type ReferredAccountRow } from "@/components/workspace/referral-card";
import { TelegramConnectCard } from "@/components/workspace/telegram-connect";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, requestTypeLabel } from "@/lib/format";
import { listReferredCompanies, referralUrl } from "@/lib/referral";
import { TELEGRAM_BOT_USERNAME } from "@/lib/site";

export const metadata: Metadata = { title: "My requests" };

export default async function CompanyHomePage() {
  const user = await requireRole("COMPANY");
  if (!user.company) redirect("/login");

  const requests = await db.liquidityRequest.findMany({
    where: { companyId: user.company.id },
    include: {
      matches: { where: { releasedToCompany: true }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const referredRows: ReferredAccountRow[] = user.company.referralCode
    ? (await listReferredCompanies(user.company.referralCode)).map((c) => ({
        id: c.id,
        label: c.companyName,
        createdAt: c.createdAt.toISOString(),
        dealClosed: c.requests.some((r) =>
          r.matches.some((m) => m.introductions.some((i) => i.status === "SUCCESSFUL")),
        ),
      }))
    : [];

  return (
    <>
      <PageHeader
        title={user.company.companyName}
        sub="Your INR liquidity requests and their progress through review, matching and introduction."
        actions={
          <Link href="/company/new-request" className="btn btn-gold btn-sm">
            New request
          </Link>
        }
      />

      <div className="card overflow-hidden">
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Daily volume</th>
                  <th>Speed</th>
                  <th>Introductions</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-gold-700">{r.reference}</td>
                    <td className="whitespace-nowrap">{requestTypeLabel(r.requestType)}</td>
                    <td className="text-xs">{r.dailyVolumeBand}</td>
                    <td className="text-xs">{r.requiredSpeed}</td>
                    <td className="tabular-nums">{r.matches.length || "—"}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/company/requests/${r.id}`}
                        className="text-xs font-medium text-gold-600 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No requests yet"
              body="Submit your first INR liquidity request — it enters manual review immediately."
            />
            <div className="mt-4 text-center">
              <Link href="/company/new-request" className="btn btn-gold btn-sm">
                Submit a request
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <TelegramConnectCard
          telegramChatId={user.telegramChatId}
          telegramLinkCode={user.telegramLinkCode}
          botUsername={TELEGRAM_BOT_USERNAME || undefined}
        />
        {user.company.referralCode ? (
          <ReferralCard
            url={referralUrl("request", user.company.referralCode)}
            code={user.company.referralCode}
            referred={referredRows}
          />
        ) : (
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Refer someone
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
              Get your own shareable link — anyone who signs up through it is on record as your
              referral from day one.
            </p>
            <form action={generateReferralCode} className="mt-3">
              <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Generating…">
                Get my link
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      <div className="card mt-6 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          What INRP2P does — and does not do
        </p>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
          INRP2P reviews your request and, if it fits the network, introduces you to a
          verified partner. INRP2P does not custody deal funds, does not execute payments or
          payouts, does not operate an exchange, and does not guarantee liquidity, a match,
          or that any transaction completes. Once introduced, you deal with the partner
          directly, and remain responsible for your own KYC, AML, tax and legal obligations.
          Full detail: <Link href="/disclaimer" className="text-gold-600 hover:underline">Disclaimer</Link>.
        </p>
      </div>
    </>
  );
}
