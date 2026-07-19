import type { Metadata } from "next";
import type { PartnerDeposit } from "@prisma/client";
import { redirect } from "next/navigation";
import { createPartnerDeposit, submitPartnerDepositTransaction } from "@/app/actions/deposits";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, Field, PageHeader, SectionTitle, Stat, StatusBadge } from "@/components/ui";
import { CopyWalletAddress } from "@/components/workspace/copy-wallet-address";
import { Flash } from "@/components/workspace/flash";
import { requireRole } from "@/lib/auth";
import { companyUsdtTrc20Address, tronAddressUrl, tronTransactionUrl } from "@/lib/deposit-wallet";
import { db } from "@/lib/db";
import { logError } from "@/lib/error-log";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "USDT reserve" };

function amount(value: { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function usdt(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function TransferAction({ item }: { item: PartnerDeposit }) {
  const canSubmit = ["AWAITING_PAYMENT", "CONFIRMING", "EXPIRED"].includes(item.status) && item.destinationAddress;
  if (!canSubmit) {
    return item.transactionHash ? <a className="btn btn-ghost btn-sm" href={tronTransactionUrl(item.transactionHash)} target="_blank" rel="noreferrer">View transaction</a> : null;
  }
  return (
    <details className="group">
      <summary className="btn btn-gold btn-sm cursor-pointer list-none">{item.status === "CONFIRMING" ? "Review submitted transfer" : item.status === "EXPIRED" ? "Report a late transfer" : "View payment instructions"}</summary>
      <div className="mt-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Company wallet · USDT TRC20</p>
            <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">{item.destinationAddress}</p>
          </div>
          <CopyWalletAddress address={item.destinationAddress!} />
        </div>
        <div className="mt-3 grid gap-2 rounded-lg border border-black/[0.06] bg-white/80 p-3 sm:grid-cols-2">
          <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Send exactly</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{usdt(amount(item.amount))} USDT</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Network</p><p className="mt-1 font-semibold text-slate-900">TRON · TRC20</p></div>
        </div>
        <form action={submitPartnerDepositTransaction} className="mt-4 space-y-3">
          <input type="hidden" name="depositId" value={item.id} />
          <Field label="Transaction hash (TXID)" hint="Paste the 64-character TXID after the transfer is broadcast.">
            <input className="input font-mono text-xs" name="transactionHash" defaultValue={item.transactionHash ?? ""} placeholder="64-character TRON TXID" required />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton className="btn btn-gold btn-sm" pendingLabel="Submitting…">{item.transactionHash ? "Update submitted TXID" : "Submit transaction for review"}</SubmitButton>
            <a className="btn btn-ghost btn-sm" href={tronAddressUrl(item.destinationAddress!)} target="_blank" rel="noreferrer">Open company wallet on TRONSCAN</a>
          </div>
        </form>
      </div>
    </details>
  );
}

export default async function PartnerDepositPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [user, flash] = await Promise.all([requireRole("PARTNER"), searchParams]);
  if (!user.partner) redirect("/login");
  let deposits: PartnerDeposit[] = [];
  let ledgerUnavailable = false;
  try {
    deposits = await db.partnerDeposit.findMany({ where: { partnerId: user.partner.id }, orderBy: { createdAt: "desc" } });
  } catch (error) {
    ledgerUnavailable = true;
    await logError({ error, source: "page:/partner/deposit", severity: "FATAL", userId: user.id, url: "/partner/deposit" });
  }
  const confirmed = deposits.filter((item) => item.status === "CONFIRMED");
  const reserve = confirmed.reduce((sum, item) => sum + amount(item.actualAmount ?? item.amount), 0);
  const awaiting = deposits.filter((item) => ["AWAITING_PAYMENT", "CONFIRMING"].includes(item.status));
  const walletAddress = companyUsdtTrc20Address();

  return (
    <>
      <PageHeader
        title="USDT operating reserve"
        sub="Create a deposit instruction, transfer USDT on TRON and submit the on-chain transaction for operator review."
      />
      <Flash {...flash} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Confirmed reserve" value={`${usdt(reserve)} USDT`} tone="emerald" />
        <Stat label="In confirmation" value={awaiting.length} sub="Invoices waiting or confirming" tone="gold" />
        <Stat label="Network" value="TRC20" sub="USDT only" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="card p-5 sm:p-6">
            <SectionTitle title="Add to reserve" />
            <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.045] p-4">
              <p className="text-sm font-semibold text-slate-900">One instruction. One exact amount. One audit record.</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Every instruction snapshots the official company wallet and exact amount. Never use an address received in chat.
              </p>
            </div>
            <form action={createPartnerDeposit} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Amount" hint="10–1,000,000 USDT · up to 6 decimals">
                <div className="relative">
                  <input className="input pr-16" name="amount" type="number" min="10" max="1000000" step="0.000001" defaultValue="300" required />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">USDT</span>
                </div>
              </Field>
              <SubmitButton className="btn btn-gold min-h-11" pendingLabel="Creating instructions…" disabled={!walletAddress || ledgerUnavailable}>
                Create deposit instructions
              </SubmitButton>
            </form>
            {!walletAddress ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Deposits are temporarily unavailable because the official company wallet is not configured. Do not send funds yet.
              </p>
            ) : null}
            {ledgerUnavailable ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">The deposit ledger is temporarily unavailable. The real server error has been recorded for operations.</p> : null}
          </div>

          <div className="card overflow-hidden">
            <div className="p-5 pb-2 sm:p-6 sm:pb-3"><SectionTitle title="Deposit history" /></div>
            {deposits.length ? (
              <>
                <div className="space-y-3 p-4 pt-2 md:hidden">
                  {deposits.map((item) => (
                    <div key={item.id} className="rounded-xl border border-black/[0.08] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-mono text-xs font-semibold text-gold-700">{item.reference}</p><p className="mt-1 text-lg font-semibold text-slate-900">{usdt(amount(item.actualAmount ?? item.amount))} USDT</p></div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">TRC20 · {fmtDateTime(item.createdAt)}</p>
                      <div className="mt-3"><TransferAction item={item} /></div>
                      {item.reviewNote ? <p className="mt-3 rounded-lg bg-black/[0.025] p-3 text-xs leading-relaxed text-slate-500">{item.reviewNote}</p> : null}
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="tbl">
                    <thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>TXID</th><th>Created</th><th /></tr></thead>
                    <tbody>
                      {deposits.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono text-xs text-gold-700">{item.reference}</td>
                          <td className="whitespace-nowrap font-semibold tabular-nums">{usdt(amount(item.actualAmount ?? item.amount))} USDT</td>
                          <td><StatusBadge status={item.status} /></td>
                          <td className="max-w-36 truncate font-mono text-[11px] text-slate-500" title={item.transactionHash ?? undefined}>{item.transactionHash ?? "—"}</td>
                          <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(item.createdAt)}</td>
                          <td><TransferAction item={item} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="p-5 pt-2 sm:p-6 sm:pt-2"><EmptyState title="No deposits yet" body="Create deposit instructions when operations asks you to fund or top up your reserve." /></div>}
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-7 xl:self-start">
          <div className="card p-5">
            <SectionTitle title="Before you pay" />
            <ol className="space-y-4 text-xs leading-relaxed text-slate-600">
              <li className="flex gap-3"><span className="font-mono text-gold-700">01</span><span>Use <strong className="text-slate-800">USDT on TRON (TRC20)</strong> only. A transfer on another network may be unrecoverable.</span></li>
              <li className="flex gap-3"><span className="font-mono text-gold-700">02</span><span>Match the full address and send the exact instructed amount from a wallet you control.</span></li>
              <li className="flex gap-3"><span className="font-mono text-gold-700">03</span><span>Submit the TXID. Your reserve is credited only after an operator verifies the token, destination, amount and confirmations.</span></li>
            </ol>
          </div>
          <div className="card border-rose-200/70 p-5">
            <SectionTitle title="Important boundary" />
            <p className="text-xs leading-relaxed text-slate-500">
              This page is only for an agreed partner operating reserve. Never use it for customer money, company settlement funds or an INR↔USDT transaction. A reserve does not guarantee traffic, income or verification.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
