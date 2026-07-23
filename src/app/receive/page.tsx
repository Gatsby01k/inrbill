import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createReceiveLink,
  revokeReceiveLink,
  updateInrp2pIdentity,
  updateReceiveProfile,
} from "@/app/actions/receive-profile";
import { CustomerShell } from "@/components/move/customer-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Receive Profile",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function methodState(status: string) {
  if (status === "OWNERSHIP_VERIFIED") return "Ownership verified";
  if (status === "FORMAT_VALIDATED") return "Address format validated";
  return status.toLowerCase().replaceAll("_", " ");
}

export default async function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; created?: string }>;
}) {
  const [session, flash] = await Promise.all([getSession(), searchParams]);
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    redirect("/auth/customer");
  }
  const [methods, receiveProfile, links] = await Promise.all([
    db.paymentMethod.findMany({
      where: {
        customerId: session.user.customer.id,
        purpose: { in: ["RECEIVE", "BOTH"] },
        status: { notIn: ["DISABLED", "REJECTED"] },
      },
      orderBy: [{ isDefaultReceive: "desc" }, { createdAt: "asc" }],
    }),
    db.receiveProfile.findUnique({
      where: { customerId: session.user.customer.id },
      include: {
        primaryMethod: true,
        fallbacks: {
          include: { paymentMethod: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.receiveLink.findMany({
      where: { customerId: session.user.customer.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const id = session.user.customer.inrp2pId;
  const createdToken =
    flash.created && /^[A-Za-z0-9_-]{32,100}$/.test(flash.created)
      ? flash.created
      : null;

  return (
    <CustomerShell active="Receive">
      <div className="move-page-heading">
        <div>
          <p className="move-eyebrow">Receive Profile</p>
          <h1>One destination, ordered fallbacks.</h1>
          <p>No fallback changes final terms without the sender accepting them.</p>
        </div>
        {id && session.user.customer.publicReceiveEnabled ? (
          <Link href={`/pay/${id}`} className="move-primary-button">Open public page</Link>
        ) : null}
      </div>

      {flash.error ? <div className="move-flash move-flash-error">{flash.error}</div> : null}
      {flash.notice ? <div className="move-flash move-flash-ok">{flash.notice}</div> : null}

      <div className="move-receive-grid">
        <section className="move-panel move-receive-profile-card">
          <div className="move-section-heading">
            <div>
              <p className="move-eyebrow">Routing preference</p>
              <h2>Receive methods</h2>
            </div>
            <span data-status={receiveProfile?.available ? "VERIFIED" : "PAUSED"}>
              {receiveProfile?.available ? "Available" : "Paused"}
            </span>
          </div>

          {receiveProfile?.primaryMethod ? (
            <ol className="move-profile-preview">
              <li>
                <span>Primary</span>
                <strong>{receiveProfile.primaryMethod.label}</strong>
                <small>{receiveProfile.primaryMethod.maskedLabel}</small>
                <em>{methodState(receiveProfile.primaryMethod.status)}</em>
              </li>
              {receiveProfile.fallbacks.map((fallback) => (
                <li key={fallback.id}>
                  <span>Fallback {fallback.position}</span>
                  <strong>{fallback.paymentMethod.label}</strong>
                  <small>{fallback.paymentMethod.maskedLabel}</small>
                  <em>{methodState(fallback.paymentMethod.status)}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="move-method-empty">Choose a primary destination below.</p>
          )}

          {methods.length ? (
            <form action={updateReceiveProfile} className="move-profile-form">
              <label>
                <span>Primary receive method</span>
                <select name="primaryMethodId" className="input" defaultValue={receiveProfile?.primaryMethodId ?? ""} required>
                  <option value="">Select primary</option>
                  {methods.map((method) => <option key={method.id} value={method.id}>{method.label} · {method.maskedLabel} · {methodState(method.status)}</option>)}
                </select>
              </label>
              {[0, 1, 2].map((index) => (
                <label key={index}>
                  <span>Fallback {index + 1} (optional)</span>
                  <select name={`fallback${index + 1}`} className="input" defaultValue={receiveProfile?.fallbacks[index]?.paymentMethodId ?? ""}>
                    <option value="">No fallback</option>
                    {methods.map((method) => <option key={method.id} value={method.id}>{method.label} · {method.maskedLabel}</option>)}
                  </select>
                </label>
              ))}
              <label className="move-check-row">
                <input type="checkbox" name="available" defaultChecked={receiveProfile?.available ?? true} />
                <span>Profile is available to receive proposed moves</span>
              </label>
              <button className="move-primary-button">Save Receive Profile</button>
            </form>
          ) : (
            <Link href="/account" className="move-secondary-button">Add a receive method</Link>
          )}

          <p className="move-method-security">
            Fallbacks are never silent. If destination, fee, final amount, or ETA changes, the
            sender must receive and accept updated terms.
          </p>
        </section>

        <aside className="move-receive-aside">
          <section className="move-panel">
            <p className="move-eyebrow">INRP2P ID</p>
            <h2 className="move-small-title">
              {id ? `${id}@inrp2p` : "Choose your financial identifier"}
            </h2>
            <p className="move-small-copy">
              Public pages expose the identifier and final quote—not full bank or wallet details.
            </p>
            <form action={updateInrp2pIdentity} className="move-id-form">
              <label>
                <span>ID</span>
                <div><input name="identity" className="input" defaultValue={id ?? ""} placeholder="rahul" required /><b>@inrp2p</b></div>
              </label>
              <label className="move-check-row">
                <input
                  type="checkbox"
                  name="public"
                  defaultChecked={session.user.customer.publicReceiveEnabled}
                />
                <span>Enable public payment-request page</span>
              </label>
              <button className="move-secondary-button">Save ID settings</button>
            </form>
            {id && session.user.customer.publicReceiveEnabled ? (
              <p className="move-public-url">{SITE_URL}/pay/{id}</p>
            ) : null}
          </section>

          <section className="move-panel">
            <p className="move-eyebrow">Payment-request link</p>
            <h2 className="move-small-title">Amount, memo, expiry, and usage limit</h2>
            <p className="move-small-copy">
              Opening a link never executes a conversion. The sender still sees terms,
              authenticates, and confirms.
            </p>
            {createdToken ? (
              <div className="move-created-link">
                <strong>Copy this link now</strong>
                <p>{SITE_URL}/r/{createdToken}</p>
              </div>
            ) : null}
            <form action={createReceiveLink} className="move-id-form">
              <label><span>Requested amount (optional)</span><input name="amount" className="input" inputMode="decimal" placeholder="Sender chooses if blank" /></label>
              <label><span>Memo (optional)</span><input name="memo" className="input" maxLength={140} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label><span>Expires in hours</span><input name="hours" type="number" min={1} max={168} defaultValue={24} className="input" /></label>
                <label><span>Maximum uses</span><input name="maxUses" type="number" min={1} max={100} defaultValue={1} className="input" /></label>
              </div>
              <button className="move-secondary-button">Create private link</button>
            </form>
            {links.length ? (
              <div className="move-link-list">
                {links.map((link) => (
                  <div key={link.id}>
                    <span>
                      {link.amount
                        ? `${link.amount.toString()} ${link.currency}`
                        : "Sender enters amount"}
                      {" · "}
                      {link.useCount}/{link.maxUses ?? "∞"} uses
                    </span>
                    <em data-status={link.active ? "ACTIVE" : "PAUSED"}>
                      {link.active ? "Active" : "Revoked"}
                    </em>
                    {link.active ? (
                      <form action={revokeReceiveLink}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <button>Revoke</button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="move-panel">
            <p className="move-eyebrow">Applicable limits</p>
            <dl className="move-order-meta">
              <div><dt>INR / move</dt><dd>{session.user.customer.inrPerOrderLimit ? `₹${session.user.customer.inrPerOrderLimit.toString()}` : "Set after verification"}</dd></div>
              <div><dt>USDT / move</dt><dd>{session.user.customer.usdtPerOrderLimit?.toString() ?? "Set after verification"}</dd></div>
              <div><dt>Compliance</dt><dd>{session.user.customer.complianceStatus.toLowerCase().replaceAll("_", " ")}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </CustomerShell>
  );
}
