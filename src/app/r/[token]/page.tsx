import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CustomerNav } from "@/components/move/customer-nav";
import { QuoteWorkspace } from "@/components/move/quote-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashOpaqueToken } from "@/lib/secure-token";

export const metadata: Metadata = {
  title: "INRP2P payment request",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ReceiveLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [{ token }, session, incoming] = await Promise.all([
    params,
    getSession(),
    headers(),
  ]);
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) notFound();
  const ip =
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    incoming.get("x-real-ip") ||
    "unknown";
  if (!(await consumeRateLimit("private-receive-page", ip, 60, 60 * 60_000))) {
    notFound();
  }
  const link = await db.receiveLink.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      customer: {
        complianceStatus: "VERIFIED",
        verificationCases: {
          some: { status: "APPROVED", expiresAt: { gt: new Date() } },
        },
        receiveProfile: {
          is: {
            available: true,
            primaryMethodId: { not: null },
            primaryMethod: {
              is: {
                status: { notIn: ["UNVERIFIED", "REJECTED", "DISABLED"] },
              },
            },
          },
        },
      },
    },
    include: {
      customer: {
        select: {
          inrp2pId: true,
          publicReceiveEnabled: true,
          receiveProfile: {
            select: {
              primaryMethod: { select: { type: true } },
            },
          },
        },
      },
    },
  });
  if (!link || (link.maxUses !== null && link.useCount >= link.maxUses)) notFound();
  const method = link.customer.receiveProfile?.primaryMethod;
  if (!method) notFound();
  const direction =
    method.type === "USDT_WALLET" ? "INR_TO_USDT" : "USDT_TO_INR";
  const customer = session?.user.role === "CUSTOMER" ? session.user.customer : null;
  const publicHandle =
    link.customer.publicReceiveEnabled && link.customer.inrp2pId
      ? link.customer.inrp2pId
      : undefined;

  return (
    <div className="move-app move-public-page">
      <CustomerNav active="Move" authenticated={Boolean(customer)} />
      <main className="move-home">
        {link.memo ? (
          <div className="move-request-memo">
            <span>Payment memo</span>
            <p>{link.memo}</p>
          </div>
        ) : null}
        <QuoteWorkspace
          authenticated={Boolean(customer)}
          maximumInr={customer?.inrPerOrderLimit?.toString()}
          maximumUsdt={customer?.usdtPerOrderLimit?.toString()}
          repeatMove={null}
          activeOrder={null}
          recipientHandle={publicHandle}
          recipientLabel={publicHandle ? undefined : "Private payment request"}
          receiveToken={token}
          initialDirection={direction}
          fixedDirection
          initialAmount={
            link.amount?.toString() ?? (direction === "INR_TO_USDT" ? "100000" : "1000")
          }
          initialExactSide={link.amount ? "RECEIVE" : "SEND"}
          amountLocked={Boolean(link.amount)}
        />
      </main>
    </div>
  );
}
