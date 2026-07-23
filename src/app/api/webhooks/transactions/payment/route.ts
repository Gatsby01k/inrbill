import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditWith } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  encryptSensitive,
  financialFingerprint,
  maskReference,
} from "@/lib/financial-crypto";
import { assertOrderTransition } from "@/lib/order-state-machine";
import { normalizeTransactionHash } from "@/lib/payment-validation";
import { payloadHash, verifyWebhookSignature } from "@/lib/webhook-security";

const payloadSchema = z.object({
  eventId: z.string().min(6).max(160),
  orderReference: z.string().regex(/^MOV-[A-Z0-9]{8,20}$/),
  status: z.enum(["DETECTED", "CONFIRMED"]),
  amount: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  currency: z.enum(["INR", "USDT"]),
  provider: z.string().min(2).max(80),
  providerReference: z.string().min(2).max(160),
  utr: z.string().regex(/^[A-Za-z0-9/-]{6,40}$/).optional(),
  txid: z.string().max(80).optional(),
});

function reviewReason(reason: string) {
  return reason.slice(0, 300);
}

async function markPaymentReview(
  reference: string,
  actorLabel: string,
  reason: string,
) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { reference } });
    if (
      !order ||
      ["COMPLETED", "CANCELLED", "EXPIRED", "FAILED", "NEEDS_REVIEW"].includes(
        order.status,
      )
    ) {
      return;
    }
    assertOrderTransition(order.status, "NEEDS_REVIEW");
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "NEEDS_REVIEW",
        attentionReason: reviewReason(reason),
        version: { increment: 1 },
      },
    });
    await tx.reconciliation.updateMany({
      where: { orderId: order.id, status: { not: "MATCHED" } },
      data: {
        status: "EXCEPTION",
        exceptionReason: reviewReason(reason),
      },
    });
    await auditWith(tx, {
      action: "order.payment_event_conflict",
      entityType: "Order",
      entityId: order.id,
      orderId: order.id,
      actorId: null,
      actorLabel,
      meta: { from: order.status, to: "NEEDS_REVIEW", reason: reviewReason(reason) },
    });
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMENT_MATCHING_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
  }
  const body = await request.text();
  if (
    !verifyWebhookSignature(
      secret,
      body,
      request.headers.get("x-inrp2p-signature"),
    )
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let input: z.infer<typeof payloadSchema>;
  try {
    input = payloadSchema.parse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }
  const providerKey = `PAYMENT:${input.provider.toUpperCase()}`;
  const eventPayloadHash = payloadHash(body);

  try {
    const outcome = await db.$transaction(
      async (tx) => {
        const replay = await tx.webhookEvent.findUnique({
          where: {
            provider_externalId: {
              provider: providerKey,
              externalId: input.eventId,
            },
          },
        });
        if (replay) {
          if (replay.payloadHash !== eventPayloadHash) {
            throw new Error("EVENT_REPLAY_CONFLICT");
          }
          return { replay: true, status: null };
        }

        const order = await tx.order.findUnique({
          where: { reference: input.orderReference },
          include: {
            sourcePaymentMethod: { include: { wallet: true } },
            paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
        if (!order) throw new Error("ORDER_NOT_FOUND");
        const attempt = order.paymentAttempts[0];
        if (!attempt) throw new Error("PAYMENT_ATTEMPT_NOT_FOUND");

        const eventRecord = {
          provider: providerKey,
          externalId: input.eventId,
          payloadHash: eventPayloadHash,
        };
        const amountMatches =
          attempt.currency === input.currency &&
          attempt.amount.equals(new Prisma.Decimal(input.amount));
        if (!amountMatches) {
          if (
            !["COMPLETED", "CANCELLED", "EXPIRED", "FAILED", "NEEDS_REVIEW"].includes(
              order.status,
            )
          ) {
            assertOrderTransition(order.status, "NEEDS_REVIEW");
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "NEEDS_REVIEW",
                attentionReason: reviewReason(
                  "Detected payment amount or currency does not match the order.",
                ),
                version: { increment: 1 },
              },
            });
            await tx.reconciliation.update({
              where: { orderId: order.id },
              data: {
                status: "EXCEPTION",
                observedSendAmount: new Prisma.Decimal(input.amount),
                exceptionReason: reviewReason(
                  "Payment matching webhook amount or currency mismatch.",
                ),
              },
            });
            await auditWith(tx, {
              action: "order.payment_match_mismatch",
              entityType: "Order",
              entityId: order.id,
              orderId: order.id,
              actorId: null,
              actorLabel: `${input.provider} webhook`,
              meta: { from: order.status, to: "NEEDS_REVIEW" },
            });
          }
          await tx.webhookEvent.create({ data: eventRecord });
          return { replay: false, status: "NEEDS_REVIEW" };
        }

        const normalizedUtr = input.utr?.toUpperCase();
        const network = order.sourcePaymentMethod.wallet?.network;
        const normalizedTxid =
          input.txid && network
            ? normalizeTransactionHash(input.txid, network)
            : null;
        if (attempt.rail === "BLOCKCHAIN" && (!network || !normalizedTxid)) {
          throw new Error("INVALID_BLOCKCHAIN_REFERENCE");
        }
        const utrHash = normalizedUtr
          ? financialFingerprint(normalizedUtr)
          : null;
        const conflictingReference = await tx.paymentAttempt.findFirst({
          where: {
            id: { not: attempt.id },
            OR: [
              ...(utrHash ? [{ utrHash }] : []),
              ...(normalizedTxid ? [{ txid: normalizedTxid }] : []),
            ],
          },
          select: { id: true },
        });
        if (conflictingReference) {
          if (
            !["COMPLETED", "CANCELLED", "EXPIRED", "FAILED", "NEEDS_REVIEW"].includes(
              order.status,
            )
          ) {
            assertOrderTransition(order.status, "NEEDS_REVIEW");
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "NEEDS_REVIEW",
                attentionReason: "Detected payment reference is already used.",
                version: { increment: 1 },
              },
            });
            await auditWith(tx, {
              action: "order.payment_reference_conflict",
              entityType: "Order",
              entityId: order.id,
              orderId: order.id,
              actorId: null,
              actorLabel: `${input.provider} webhook`,
              meta: { from: order.status, to: "NEEDS_REVIEW" },
            });
          }
          await tx.webhookEvent.create({ data: eventRecord });
          return { replay: false, status: "NEEDS_REVIEW" };
        }

        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            provider: input.provider,
            providerReference: input.providerReference,
            status: input.status,
            detectedAt: attempt.detectedAt ?? new Date(),
            confirmedAt: input.status === "CONFIRMED" ? new Date() : attempt.confirmedAt,
            ...(normalizedUtr
              ? {
                  utrEncrypted: encryptSensitive(normalizedUtr),
                  utrHash,
                  utrMasked: maskReference(normalizedUtr),
                }
              : {}),
            ...(normalizedTxid ? { txid: normalizedTxid } : {}),
          },
        });

        let status = order.status;
        if (["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"].includes(status)) {
          assertOrderTransition(status, "PAYMENT_DETECTED");
          await tx.order.update({
            where: { id: order.id },
            data: { status: "PAYMENT_DETECTED", version: { increment: 1 } },
          });
          await auditWith(tx, {
            action: "order.payment_detected",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: status, to: "PAYMENT_DETECTED" },
          });
          status = "PAYMENT_DETECTED";
        }

        if (input.status === "CONFIRMED" && status === "PAYMENT_DETECTED") {
          assertOrderTransition(status, "PAYMENT_CONFIRMED");
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "PAYMENT_CONFIRMED",
              paymentConfirmedAt: new Date(),
              version: { increment: 1 },
            },
          });
          await auditWith(tx, {
            action: "order.payment_confirmed",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: status, to: "PAYMENT_CONFIRMED" },
          });
          assertOrderTransition("PAYMENT_CONFIRMED", "SETTLEMENT_PENDING");
          await tx.order.update({
            where: { id: order.id },
            data: { status: "SETTLEMENT_PENDING", version: { increment: 1 } },
          });
          await tx.orderLeg.updateMany({
            where: {
              orderId: order.id,
              status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] },
            },
            data: { status: "SETTLEMENT_PENDING" },
          });
          await tx.reconciliation.update({
            where: { orderId: order.id },
            data: {
              paymentMatched: true,
              observedSendAmount: attempt.amount,
            },
          });
          await auditWith(tx, {
            action: "order.ready_to_settle",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: "PAYMENT_CONFIRMED", to: "SETTLEMENT_PENDING" },
          });
          status = "SETTLEMENT_PENDING";
        }

        await tx.webhookEvent.create({ data: eventRecord });
        return { replay: false, status };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await db.webhookEvent.findUnique({
        where: {
          provider_externalId: {
            provider: providerKey,
            externalId: input.eventId,
          },
        },
      });
      if (replay?.payloadHash === eventPayloadHash) {
        return NextResponse.json({ ok: true, replay: true });
      }
      await markPaymentReview(
        input.orderReference,
        `${input.provider} webhook`,
        "A payment reference conflicted during concurrent processing.",
      );
      return NextResponse.json({ error: "Payment reference conflict." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_NOT_FOUND" || message === "PAYMENT_ATTEMPT_NOT_FOUND") {
      return NextResponse.json({ error: "Order payment target not found." }, { status: 404 });
    }
    if (message === "INVALID_BLOCKCHAIN_REFERENCE") {
      await markPaymentReview(
        input.orderReference,
        `${input.provider} webhook`,
        "Payment provider supplied an invalid blockchain reference.",
      );
      return NextResponse.json({ error: "Invalid blockchain payment reference." }, { status: 400 });
    }
    if (message === "EVENT_REPLAY_CONFLICT") {
      await markPaymentReview(
        input.orderReference,
        `${input.provider} webhook`,
        "A webhook event ID was replayed with a different payload.",
      );
      return NextResponse.json({ error: "Webhook replay conflict." }, { status: 409 });
    }
    return NextResponse.json({ error: "Payment event could not be processed." }, { status: 500 });
  }
}
