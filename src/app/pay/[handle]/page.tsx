import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CustomerNav } from "@/components/move/customer-nav";
import { QuoteWorkspace } from "@/components/move/quote-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Pay an INRP2P ID",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicReceivePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const [{ handle: rawHandle }, session, incoming] = await Promise.all([
    params,
    getSession(),
    headers(),
  ]);
  const handle = rawHandle.trim().toLowerCase().replace(/@inrp2p$/i, "");
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(handle)) notFound();
  const ip =
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    incoming.get("x-real-ip") ||
    "unknown";
  if (!(await consumeRateLimit("public-receive-page", ip, 60, 60 * 60_000))) {
    notFound();
  }
  const recipient = await db.customerProfile.findFirst({
    where: {
      inrp2pId: handle,
      publicReceiveEnabled: true,
      complianceStatus: "VERIFIED",
      verificationCases: {
        some: { status: "APPROVED", expiresAt: { gt: new Date() } },
      },
      receiveProfile: {
        is: {
          available: true,
          primaryMethodId: { not: null },
        },
      },
    },
    select: {
      receiveProfile: {
        select: {
          primaryMethod: {
            select: { type: true, status: true },
          },
        },
      },
    },
  });
  const method = recipient?.receiveProfile?.primaryMethod;
  if (!method || ["DISABLED", "REJECTED", "UNVERIFIED"].includes(method.status)) notFound();
  const direction = method.type === "USDT_WALLET" ? "INR_TO_USDT" : "USDT_TO_INR";
  const customer = session?.user.role === "CUSTOMER" ? session.user.customer : null;

  return (
    <div className="move-app move-public-page">
      <CustomerNav active="Move" authenticated={Boolean(customer)} />
      <main className="move-home">
        <QuoteWorkspace
          authenticated={Boolean(customer)}
          maximumInr={customer?.inrPerOrderLimit?.toString()}
          maximumUsdt={customer?.usdtPerOrderLimit?.toString()}
          repeatMove={null}
          activeOrder={null}
          recipientHandle={handle}
          initialDirection={direction}
          fixedDirection
        />
      </main>
    </div>
  );
}
