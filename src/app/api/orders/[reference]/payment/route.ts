import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditWith } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  encryptSensitive,
  financialFingerprint,
  FinancialDataConfigurationError,
  maskReference,
} from "@/lib/financial-crypto";
import { expireUnpaidOrder } from "@/lib/order-expiry";
import { assertOrderTransition } from "@/lib/order-state-machine";
import { normalizeTransactionHash } from "@/lib/payment-validation";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOriginRequest,
  requestIp,
  validIdempotencyKey,
} from "@/lib/request-security";

const schema = z.object({
  utr: z.string().trim().regex(/^[A-Za-z0-9/-]{6,40}$/).optional(),
  txid: z.string().trim().max(80).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const session = await getSession();
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!validIdempotencyKey(request.headers.get("idempotency-key"))) {
    return NextResponse.json({ error: "A valid idempotency key is required." }, { status: 400 });
  }
  if (
    !(await consumeRateLimit(
      "customer-payment-submit",
      `${session.user.id}:${requestIp(request)}`,
      12,
      60 * 60_000,
    ))
  ) {
    return NextResponse.json(
      { error: "Too many payment submissions. Try again later." },
      { status: 429 },
    );
  }
  const { reference } = await params;
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Enter a valid payment reference." },
      { status: 400 },
    );
  }

  try {
    await expireUnpaidOrder(reference, session.user.customer.id);
    const result = await db.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { reference, customerId: session.user.customer!.id },
          include: {
            paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
            sourcePaymentMethod: { include: { wallet: true } },
          },
        });
        if (!order) return { status: 404 as const, error: "Order not found." };
        if (["PAYMENT_SUBMITTED", "PAYMENT_DETECTED", "PAYMENT_CONFIRMED"].includes(order.status)) {
          return { status: 200 as const, orderStatus: order.status };
        }
        if (
          order.status !== "AWAITING_PAYMENT" ||
          !order.paymentDeadline ||
          order.paymentDeadline <= new Date()
        ) {
          return { status: 409 as const, error: "Payment can no longer be submitted for this order." };
        }
        assertOrderTransition(order.status, "PAYMENT_SUBMITTED");
        const attempt = order.paymentAttempts[0];
        if (!attempt) return { status: 409 as const, error: "Payment instructions are unavailable." };

        const utr = input.utr?.toUpperCase();
        const txid =
          attempt.rail === "BLOCKCHAIN" &&
          order.sourcePaymentMethod.wallet &&
          input.txid
            ? normalizeTransactionHash(
                input.txid,
                order.sourcePaymentMethod.wallet.network,
              )
            : null;
        if (attempt.rail === "BLOCKCHAIN" && !txid) {
          return {
            status: 400 as const,
            error: "Enter a valid transaction ID for the selected network.",
          };
        }
        if (attempt.rail !== "BLOCKCHAIN" && input.txid) {
          return {
            status: 400 as const,
            error: "A transaction ID is not valid for this payment rail.",
          };
        }
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
            ...(utr
              ? {
                  utrEncrypted: encryptSensitive(utr),
                  utrHash: financialFingerprint(utr),
                  utrMasked: maskReference(utr),
                }
              : {}),
            ...(txid ? { txid } : {}),
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_SUBMITTED",
            paymentSubmittedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await auditWith(tx, {
          action: "order.payment_submitted",
          entityType: "Order",
          entityId: order.id,
          orderId: order.id,
          actorId: session.user.id,
          actorLabel: "Customer",
          meta: {
            from: order.status,
            to: "PAYMENT_SUBMITTED",
            utrProvided: Boolean(utr),
            txidProvided: Boolean(txid),
          },
        });
        return { status: 200 as const, orderStatus: "PAYMENT_SUBMITTED" };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, status: result.orderStatus });
  } catch (error) {
    if (error instanceof FinancialDataConfigurationError) {
      return NextResponse.json({ error: "Secure UTR storage is not configured." }, { status: 503 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            reference,
            customerId: session.user.customer!.id,
            status: "AWAITING_PAYMENT",
          },
        });
        if (!order) return;
        assertOrderTransition(order.status, "NEEDS_REVIEW");
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "NEEDS_REVIEW",
            attentionReason: "The submitted payment reference is already used.",
            version: { increment: 1 },
          },
        });
        await auditWith(tx, {
          action: "order.payment_reference_conflict",
          entityType: "Order",
          entityId: order.id,
          orderId: order.id,
          actorId: session.user.id,
          actorLabel: "Customer",
          meta: { from: order.status, to: "NEEDS_REVIEW" },
        });
      });
      return NextResponse.json(
        {
          error:
            "This payment reference is already attached to another order. Operations review is required.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Payment submission could not be recorded." }, { status: 500 });
  }
}
