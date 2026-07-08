import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, requestTypeLabel } from "@/lib/format";

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
                    <td className="font-mono text-xs text-gold-400">{r.reference}</td>
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
                        className="text-xs font-medium text-gold-400 hover:underline"
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

      <div className="card mt-6 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          What INRP2P does — and does not do
        </p>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
          INRP2P reviews your request and, if it fits the network, introduces you to a
          verified partner. INRP2P does not custody funds, does not execute payments or
          payouts, does not operate an exchange, and does not guarantee liquidity, a match,
          or that any transaction completes. Once introduced, you deal with the partner
          directly, and remain responsible for your own KYC, AML, tax and legal obligations.
          Full detail: <Link href="/disclaimer" className="text-gold-400 hover:underline">Disclaimer</Link>.
        </p>
      </div>
    </>
  );
}
