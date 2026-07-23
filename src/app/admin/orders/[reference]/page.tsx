import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  confirmOrderPayment,
  confirmOrderSettlement,
  grantRiskOverride,
  openOrderReview,
  reassignOrderLiquidity,
  recordManualSettlementSent,
  releaseOrderSettlement,
  resolveOrderRiskReview,
} from "@/app/actions/orders-admin";
import { BackLink, KV, PageHeader, StatusBadge } from "@/components/ui";
import { doublePaymentBlockers } from "@/lib/double-payment-shield";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLabel, fmtDateTime, money } from "@/lib/format";
import { settlementProviderConfigured } from "@/lib/settlement-provider";

export const metadata: Metadata = { title: "Order operations" };
export const dynamic = "force-dynamic";

function CriticalFields({
  reference,
  defaultReason,
}: {
  reference: string;
  defaultReason: string;
}) {
  return (
    <>
      <input type="hidden" name="reference" value={reference} />
      <label className="block">
        <span className="lbl">Reason</span>
        <input name="reason" className="input" defaultValue={defaultReason} minLength={8} maxLength={500} required />
      </label>
      <label className="block">
        <span className="lbl">Authenticator code</span>
        <input name="totpCode" className="input tnum" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required />
      </label>
    </>
  );
}

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ reference }, flash, admin] = await Promise.all([
    params,
    searchParams,
    requireRole("ADMIN"),
  ]);
  const order = await db.order.findUnique({
    where: { reference },
    include: {
      customer: { include: { user: true } },
      recipientCustomer: { include: { user: true } },
      quote: true,
      sourcePaymentMethod: true,
      destinationPaymentMethod: { include: { wallet: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" } },
      settlementAttempts: {
        orderBy: { createdAt: "desc" },
        include: { evidence: { select: { id: true } } },
      },
      legs: {
        orderBy: { sequence: "asc" },
        include: {
          assignments: {
            include: {
              partner: true,
              liquidityCapacity: true,
              evidence: true,
            },
          },
          evidence: true,
        },
      },
      evidence: true,
      disputes: { orderBy: { createdAt: "desc" } },
      reconciliation: true,
    },
  });
  if (!order) notFound();
  const [events, replacementCapacities] = await Promise.all([
    db.auditLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.liquidityCapacity.findMany({
      where: {
        direction: order.direction,
        status: "AVAILABLE",
        availableUntil: { gt: new Date() },
        availableInr: {
          gte: order.sendCurrency === "INR" ? order.sendAmount : order.receiveAmount,
        },
        availableUsdt: {
          gte: order.sendCurrency === "USDT" ? order.sendAmount : order.receiveAmount,
        },
        partner: {
          status: "VERIFIED",
          verificationCases: {
            some: { status: "APPROVED", expiresAt: { gt: new Date() } },
          },
        },
      },
      include: { partner: true },
      orderBy: { lastConfirmedAt: "desc" },
      take: 30,
    }),
  ]);
  const activeLegs = order.legs.filter(
    (leg) => !["FROZEN", "CANCELLED", "FAILED"].includes(leg.status),
  );
  const blockers = doublePaymentBlockers({
    paymentStatus: order.status,
    paymentAttempts: order.paymentAttempts.map((attempt) => ({
      status: attempt.status,
      utrHash: attempt.utrHash,
      txid: attempt.txid,
    })),
    settlementAttempts: order.settlementAttempts.map((attempt) => ({
      status: attempt.status,
      txid: attempt.txid,
      payoutReferenceHash: attempt.payoutReferenceHash,
    })),
    assignments: activeLegs.flatMap((leg) =>
      leg.assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status,
        evidenceCount: assignment.evidence.length,
      })),
    ),
    activeLegCount: activeLegs.length,
  });
  const currentAssignment = activeLegs[0]?.assignments.find(
    (assignment) => assignment.status === "ACTIVE",
  );
  const latestPayment = order.paymentAttempts[0];
  const latestSettlement = order.settlementAttempts[0];
  const assignmentEvidence = currentAssignment?.evidence.length ?? 0;
  const paymentHasReference = Boolean(
    latestPayment?.providerReference ||
      (latestPayment?.rail === "BLOCKCHAIN" ? latestPayment.txid : latestPayment?.utrHash),
  );
  const canReturnToPayment =
    order.status === "NEEDS_REVIEW" &&
    activeLegs.length === 1 &&
    Boolean(currentAssignment) &&
    assignmentEvidence === 0 &&
    order.settlementAttempts.length === 0 &&
    latestPayment?.status === "INSTRUCTIONS_ISSUED" &&
    order.paymentAttempts.every(
      (attempt) => !attempt.utrHash && !attempt.txid && !attempt.providerReference,
    );
  const canVerifyPayment =
    order.status === "NEEDS_REVIEW" &&
    activeLegs.length === 1 &&
    Boolean(currentAssignment) &&
    assignmentEvidence === 0 &&
    order.settlementAttempts.length === 0 &&
    Boolean(latestPayment) &&
    ["SUBMITTED", "DETECTED", "CONFIRMED"].includes(latestPayment?.status ?? "") &&
    paymentHasReference;
  const canResumeConfirming =
    order.status === "NEEDS_REVIEW" &&
    activeLegs.length === 1 &&
    Boolean(currentAssignment) &&
    order.settlementAttempts.length === 1 &&
    ["SENT", "DETECTED"].includes(latestSettlement?.status ?? "") &&
    Boolean(
      latestSettlement &&
        (latestSettlement.currency === "USDT"
          ? latestSettlement.txid
          : latestSettlement.payoutReferenceHash),
    );
  const canRetrySettlement =
    order.status === "NEEDS_REVIEW" &&
    activeLegs.length === 1 &&
    Boolean(currentAssignment) &&
    assignmentEvidence === 0 &&
    order.settlementAttempts.length === 1 &&
    ["BLOCKED", "FAILED", "CANCELLED"].includes(latestSettlement?.status ?? "") &&
    !latestSettlement?.txid &&
    !latestSettlement?.payoutReferenceHash &&
    (latestSettlement?.evidence.length ?? 0) === 0;
  const hasDeterministicRiskResolution =
    canReturnToPayment ||
    canVerifyPayment ||
    canResumeConfirming ||
    canRetrySettlement;
  const canOpenReview = !["COMPLETED", "CANCELLED", "EXPIRED", "FAILED"].includes(order.status);

  return (
    <>
      <div className="mb-4"><BackLink href="/admin/orders" label="Orders" /></div>
      <PageHeader
        title={order.reference}
        sub={`${order.customer.user.name} · ${order.customer.user.email}`}
        actions={<StatusBadge status={order.status} />}
      />
      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}
      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}

      {order.attentionReason ? (
        <section className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-600">Needs attention</p>
          <p className="mt-1 text-xs text-rose-800">{order.attentionReason}</p>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="grid gap-5">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Customer order</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KV label="You send">{money(order.sendAmount.toString(), order.sendCurrency)}</KV>
              <KV label="You receive">{money(order.receiveAmount.toString(), order.receiveCurrency)}</KV>
              <KV label="Rate">₹{order.rate.toString()} / USDT</KV>
              <KV label="Fee">{money(order.feeAmount.toString(), order.feeCurrency)}</KV>
              <KV label="Payment source">{order.sourcePaymentMethod.maskedLabel}</KV>
              <KV label="Destination">{order.destinationPaymentMethod.maskedLabel}</KV>
              <KV label="Created">{fmtDateTime(order.createdAt)}</KV>
              <KV label="Payment deadline">{order.paymentDeadline ? fmtDateTime(order.paymentDeadline) : "—"}</KV>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-black/[0.07] px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Internal legs and assignments</h2>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {order.legs.map((leg) => (
                <div key={leg.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-slate-800">Leg {leg.sequence}</strong>
                    <StatusBadge status={leg.status} />
                  </div>
                  {leg.assignments.map((assignment) => (
                    <dl key={assignment.id} className="mt-3 grid gap-3 rounded-xl bg-black/[0.025] p-4 sm:grid-cols-3">
                      <KV label="Partner">{assignment.partner.reference} · {assignment.partner.displayName}</KV>
                      <KV label="Assignment"><StatusBadge status={assignment.status} /></KV>
                      <KV label="Reserved">{money(assignment.reservedInr.toString(), "INR")} / {money(assignment.reservedUsdt.toString(), "USDT")}</KV>
                      <KV label="Capacity available">{money(assignment.liquidityCapacity.availableInr.toString(), "INR")} / {money(assignment.liquidityCapacity.availableUsdt.toString(), "USDT")}</KV>
                      <KV label="Collection">{assignment.liquidityCapacity.collectionDetailsMasked}</KV>
                      <KV label="Evidence">{assignment.evidence.length}</KV>
                    </dl>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Attempts and references</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Payment attempts</h3>
                <div className="mt-2 grid gap-2">
                  {order.paymentAttempts.map((attempt) => (
                    <div key={attempt.id} className="rounded-xl border border-black/[0.08] p-3 text-[10.5px]">
                      <div className="flex justify-between gap-3"><StatusBadge status={attempt.status} /><span>{attempt.rail}</span></div>
                      <p className="mt-2">{money(attempt.amount.toString(), attempt.currency)} · {attempt.rail === "BLOCKCHAIN" ? `TXID ${attempt.txid ?? "not recorded"}` : `UTR ${attempt.utrMasked ?? "not recorded"}`}</p>
                      <p className="mt-1 text-slate-500">{attempt.provider ?? "Manual/customer signal"} · {attempt.providerReference ?? "No provider reference"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Settlement attempts</h3>
                <div className="mt-2 grid gap-2">
                  {order.settlementAttempts.length ? order.settlementAttempts.map((attempt) => (
                    <div key={attempt.id} className="rounded-xl border border-black/[0.08] p-3 text-[10.5px]">
                      <div className="flex justify-between gap-3"><StatusBadge status={attempt.status} /><span>{attempt.network ?? attempt.currency}</span></div>
                      <p className="mt-2">{money(attempt.amount.toString(), attempt.currency)}</p>
                      <p className="mt-1 break-all text-slate-500">TXID {attempt.txid ?? "—"} · Payout {attempt.payoutReferenceMasked ?? "—"}</p>
                    </div>
                  )) : <p className="rounded-xl border border-dashed border-black/15 p-4 text-[10.5px] text-slate-500">No settlement attempt.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Append-only timeline</h2>
            <ol className="mt-4 grid gap-3">
              {events.map((event) => (
                <li key={event.id} className="grid grid-cols-[110px_1fr] gap-3 border-b border-black/[0.06] pb-3 text-[10.5px] last:border-0">
                  <time className="text-slate-400">{fmtDateTime(event.createdAt)}</time>
                  <div><strong className="text-slate-700">{auditLabel(event.action, event.meta)}</strong><p className="mt-0.5 text-slate-500">{event.actorLabel}</p></div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Action queue</h2>
            <p className="mt-1 text-[10.5px] text-slate-500">Every action validates state, permission, TOTP, actor, reason and idempotency on the server.</p>

            {["PAYMENT_SUBMITTED", "PAYMENT_DETECTED"].includes(order.status) ? (
              <form action={confirmOrderPayment} className="admin-critical-form mt-4">
                <h3>Confirm payment</h3>
                <CriticalFields reference={order.reference} defaultReason="Payment independently verified against provider or bank record." />
                <button className="btn btn-gold w-full">Confirm payment</button>
              </form>
            ) : null}

            {order.status === "SETTLEMENT_PENDING" ? (
              <>
                <form action={releaseOrderSettlement} className="admin-critical-form mt-4">
                  <h3>Release settlement</h3>
                  <p>{settlementProviderConfigured() ? "Configured provider will receive an idempotent release request." : "Disabled until a real settlement provider is configured."}</p>
                  <CriticalFields reference={order.reference} defaultReason="Payment confirmed; destination and double-payment shield reviewed." />
                  <button className="btn btn-gold w-full" disabled={!settlementProviderConfigured()}>Release through provider</button>
                </form>
                <form action={recordManualSettlementSent} className="admin-critical-form mt-4">
                  <h3>Record actual external settlement</h3>
                  <p>Use only after the irreversible transfer occurred outside INRP2P.</p>
                  <CriticalFields reference={order.reference} defaultReason="External transfer independently executed and reference verified." />
                  <label><span className="lbl">TXID (USDT)</span><input name="txid" className="input" /></label>
                  <label><span className="lbl">Payout reference (INR)</span><input name="payoutReference" className="input" /></label>
                  <label className="flex items-start gap-2 text-[10.5px] text-slate-600"><input type="checkbox" name="executionConfirmed" value="confirmed" className="mt-0.5" required />I confirm an irreversible external transfer actually occurred.</label>
                  <button className="btn btn-ghost w-full">Record sent</button>
                </form>
              </>
            ) : null}

            {["SETTLEMENT_SENT", "CONFIRMING"].includes(order.status) ? (
              <form action={confirmOrderSettlement} className="admin-critical-form mt-4">
                <h3>Confirm final settlement</h3>
                <CriticalFields reference={order.reference} defaultReason="Final network or payout confirmation independently verified." />
                <button className="btn btn-gold w-full">Confirm and reconcile</button>
              </form>
            ) : null}

            {order.status === "AWAITING_PAYMENT" ? (
              <form action={reassignOrderLiquidity} className="admin-critical-form mt-4">
                <h3>Safe reassignment</h3>
                {blockers.length ? (
                  <ul className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[10px] text-rose-700">
                    {blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
                  </ul>
                ) : (
                  <p>No irreversible action, UTR, proof or settlement attempt detected.</p>
                )}
                <label><span className="lbl">Replacement capacity</span><select name="capacityId" className="input" required><option value="">Select eligible capacity</option>{replacementCapacities.filter((capacity) => capacity.id !== currentAssignment?.liquidityCapacityId).map((capacity) => <option key={capacity.id} value={capacity.id}>{capacity.partner.reference} · {capacity.partner.displayName} · {money(capacity.availableInr.toString(), "INR")} / {money(capacity.availableUsdt.toString(), "USDT")}</option>)}</select></label>
                <CriticalFields reference={order.reference} defaultReason="Previous assignment has no irreversible action; replacement capacity confirmed." />
                <button className="btn btn-ghost w-full" disabled={Boolean(blockers.length)}>Freeze and reassign</button>
              </form>
            ) : null}

            {canOpenReview ? (
              <form action={openOrderReview} className="admin-critical-form mt-4">
                <h3>Pause / open review</h3>
                <CriticalFields reference={order.reference} defaultReason="Operational exception requires investigation before funds move." />
                <button className="btn btn-ghost w-full">Open review</button>
              </form>
            ) : null}

            {admin.adminPermissions.includes("RISK_OVERRIDE") && order.status === "NEEDS_REVIEW" ? (
              <form action={resolveOrderRiskReview} className="admin-critical-form mt-4">
                <h3>Resolve exceptional review</h3>
                <p>
                  Only server-derived actions supported by the current attempts, references,
                  evidence and capacity exposure are available.
                </p>
                <CriticalFields reference={order.reference} defaultReason="Independent bank, network or provider reconciliation completed; existing attempts and evidence reviewed." />
                <label className="flex items-start gap-2 text-[10.5px] text-slate-600">
                  <input type="checkbox" name="independentCheck" value="confirmed" className="mt-0.5" required />
                  I independently checked the real provider, bank or network record and the stated resolution is accurate.
                </label>
                <div className="grid gap-2">
                  {canReturnToPayment ? (
                    <button className="btn btn-ghost w-full" name="resolution" value="RETURN_TO_PAYMENT">
                      Reopen payment window
                    </button>
                  ) : null}
                  {canVerifyPayment ? (
                    <button className="btn btn-ghost w-full" name="resolution" value="VERIFY_PAYMENT">
                      Verify payment and continue
                    </button>
                  ) : null}
                  {canResumeConfirming ? (
                    <button className="btn btn-ghost w-full" name="resolution" value="RESUME_CONFIRMING">
                      Resume settlement confirmation
                    </button>
                  ) : null}
                  {canRetrySettlement ? (
                    <button className="btn btn-ghost w-full" name="resolution" value="RETRY_SETTLEMENT">
                      Confirm no transfer and allow one retry
                    </button>
                  ) : null}
                  {!hasDeterministicRiskResolution ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
                      No safe automated resolution matches these records. Keep the order paused
                      and reconcile the conflicting evidence externally.
                    </p>
                  ) : null}
                </div>
              </form>
            ) : null}

            {admin.adminPermissions.includes("RISK_OVERRIDE") ? (
              <form action={grantRiskOverride} className="admin-critical-form mt-4">
                <h3>Append review finding</h3>
                <p>This adds an elevated audit finding only. It never moves funds or changes status.</p>
                <CriticalFields reference={order.reference} defaultReason="Elevated review finding recorded against all existing attempts and evidence." />
                <button className="btn btn-ghost w-full">Record finding</button>
              </form>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Double-payment shield</h2>
            {blockers.length ? (
              <ul className="mt-3 grid gap-2">
                {blockers.map((blocker) => (
                  <li key={blocker.code} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <strong className="text-[10px] text-rose-700">{blocker.code}</strong>
                    <p className="mt-1 text-[10.5px] text-rose-700">{blocker.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-leaf-200 bg-leaf-50 p-3 text-[10.5px] text-leaf-700">
                No duplicate-settlement blocker is present at this moment.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Reconciliation</h2>
            {order.reconciliation ? (
              <dl className="mt-4 grid gap-3">
                <KV label="Status"><StatusBadge status={order.reconciliation.status} /></KV>
                <KV label="Payment matched">{order.reconciliation.paymentMatched ? "Yes" : "No"}</KV>
                <KV label="Settlement matched">{order.reconciliation.settlementMatched ? "Yes" : "No"}</KV>
                <KV label="Expected">{money(order.reconciliation.expectedSendAmount.toString(), order.sendCurrency)} → {money(order.reconciliation.expectedReceiveAmount.toString(), order.receiveCurrency)}</KV>
                <KV label="Exception">{order.reconciliation.exceptionReason ?? "None"}</KV>
              </dl>
            ) : <p className="mt-3 text-xs text-slate-500">No reconciliation record.</p>}
          </section>
        </aside>
      </div>
      <p className="mt-6 text-center text-[10px] text-slate-400">
        Customer view never exposes partner assignment, capacity records or this internal timeline.
      </p>
    </>
  );
}
