import type { Metadata } from "next";
import {
  createLiquidityCapacity,
  pauseLiquidityCapacity,
} from "@/app/actions/liquidity-capacity";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDateTime, money, statusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Liquidity capacity" };
export const dynamic = "force-dynamic";

export default async function AdminLiquidityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [flash, partners, capacities] = await Promise.all([
    searchParams,
    db.partnerProfile.findMany({
      where: {
        status: "VERIFIED",
        verificationCases: {
          some: { status: "APPROVED", expiresAt: { gt: new Date() } },
        },
      },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, reference: true },
    }),
    db.liquidityCapacity.findMany({
      include: { partner: { select: { displayName: true, reference: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Exact liquidity capacity"
        sub="Declared, reserved, available, pending and settled exposure are stored separately. Creation is explicit; reservation is transactional."
      />
      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}
      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}

      <section className="card p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-slate-900">Declare capacity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Collection details are encrypted. Never enter a seed phrase, private key or banking password.
          </p>
        </div>
        {partners.length ? (
          <form action={createLiquidityCapacity} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="lbl">Partner</span>
                <select name="partnerId" className="input" required>
                  <option value="">Select verified partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.reference} · {partner.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="lbl">Direction</span>
                <select name="direction" className="input" defaultValue="INR_TO_USDT">
                  <option value="INR_TO_USDT">INR → USDT</option>
                  <option value="USDT_TO_INR">USDT → INR</option>
                </select>
              </label>
              <label className="block">
                <span className="lbl">Declared INR</span>
                <input name="declaredInr" className="input" inputMode="decimal" placeholder="1000000" required />
              </label>
              <label className="block">
                <span className="lbl">Declared USDT</span>
                <input name="declaredUsdt" className="input" inputMode="decimal" placeholder="10000" required />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label><span className="lbl">Min INR</span><input name="minInr" className="input" inputMode="decimal" /></label>
              <label><span className="lbl">Max INR</span><input name="maxInr" className="input" inputMode="decimal" /></label>
              <label><span className="lbl">Min USDT</span><input name="minUsdt" className="input" inputMode="decimal" /></label>
              <label><span className="lbl">Max USDT</span><input name="maxUsdt" className="input" inputMode="decimal" /></label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <fieldset className="rounded-xl border border-black/[0.09] p-4">
                <legend className="px-1 text-[11px] font-semibold text-slate-600">Supported customer rails</legend>
                <div className="flex flex-wrap gap-4">
                  {["UPI", "IMPS", "BANK_TRANSFER", "BLOCKCHAIN"].map((rail) => (
                    <label key={rail} className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" name="rails" value={rail} className="accent-orange-600" />
                      {rail.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-black/[0.09] p-4">
                <legend className="px-1 text-[11px] font-semibold text-slate-600">USDT networks</legend>
                <div className="flex flex-wrap gap-4">
                  {["TRC20", "ERC20", "POLYGON"].map((network) => (
                    <label key={network} className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" name="networks" value={network} className="accent-orange-600" />
                      {network}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="rounded-xl border border-black/[0.09] bg-[#faf8f4] p-4">
              <h3 className="text-xs font-semibold text-slate-800">Customer payment destination</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                For INR → USDT use UPI/IMPS/bank. For USDT → INR use blockchain. Only the selected matching fields are stored.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="lbl">Collection rail</span><select name="collectionRail" className="input"><option>UPI</option><option>IMPS</option><option>BANK_TRANSFER</option><option>BLOCKCHAIN</option></select></label>
                <label><span className="lbl">Beneficiary</span><input name="beneficiary" className="input" /></label>
                <label><span className="lbl">UPI ID</span><input name="upiId" className="input" placeholder="beneficiary@bank" /></label>
                <label><span className="lbl">Bank name</span><input name="bankName" className="input" /></label>
                <label><span className="lbl">Account number</span><input name="accountNumber" className="input" inputMode="numeric" /></label>
                <label><span className="lbl">IFSC</span><input name="ifsc" className="input" /></label>
                <label><span className="lbl">Collection network</span><select name="collectionNetwork" className="input"><option>TRC20</option><option>ERC20</option><option>POLYGON</option></select></label>
                <label><span className="lbl">Collection wallet</span><input name="collectionAddress" className="input" spellCheck={false} /></label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className="lbl">Banks (repeat field if needed)</span><input name="banks" className="input" placeholder="HDFC" /></label>
              <label><span className="lbl">Working hours</span><input name="workingHours" className="input" placeholder="09:00–21:00 IST" /></label>
              <label><span className="lbl">Available for hours</span><input name="hours" type="number" min={1} max={24} defaultValue={8} className="input" /></label>
            </div>
            <button className="btn btn-gold w-full sm:w-auto sm:justify-self-start">
              Create audited capacity
            </button>
          </form>
        ) : (
          <p className="rounded-xl border border-dashed border-black/15 p-5 text-xs text-slate-500">
            No partner has both Verified status and an approved, unexpired verification case.
          </p>
        )}
      </section>

      <section className="mt-6 card overflow-hidden">
        <div className="border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Capacity ledger</h2>
        </div>
        {capacities.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-black/[0.025] text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Partner / direction</th>
                  <th className="px-4 py-3">Declared</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Settled</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {capacities.map((capacity) => (
                  <tr key={capacity.id} className="align-top">
                    <td className="px-4 py-3">
                      <strong className="block text-slate-800">{capacity.partner.displayName}</strong>
                      <span className="text-[10px] text-slate-500">{capacity.partner.reference} · {capacity.direction.replaceAll("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 tnum">{money(capacity.declaredInr.toString(), "INR")}<br />{money(capacity.declaredUsdt.toString(), "USDT")}</td>
                    <td className="px-4 py-3 tnum">{money(capacity.availableInr.toString(), "INR")}<br />{money(capacity.availableUsdt.toString(), "USDT")}</td>
                    <td className="px-4 py-3 tnum">{money(capacity.reservedInr.toString(), "INR")}<br />{money(capacity.reservedUsdt.toString(), "USDT")}</td>
                    <td className="px-4 py-3 tnum">{money(capacity.pendingInr.toString(), "INR")}<br />{money(capacity.pendingUsdt.toString(), "USDT")}</td>
                    <td className="px-4 py-3 tnum">{money(capacity.settledInr.toString(), "INR")}<br />{money(capacity.settledUsdt.toString(), "USDT")}</td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-700">{statusLabel(capacity.status)}</strong>
                      <span className="text-[10px] text-slate-500">Until {fmtDateTime(capacity.availableUntil)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {capacity.status === "AVAILABLE" ? (
                        <form action={pauseLiquidityCapacity}>
                          <input type="hidden" name="capacityId" value={capacity.id} />
                          <button className="btn btn-ghost btn-sm">Pause</button>
                        </form>
                      ) : (
                        <span className="text-[10px] text-slate-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-xs text-slate-500">No exact capacity has been declared.</p>
        )}
      </section>
    </>
  );
}
