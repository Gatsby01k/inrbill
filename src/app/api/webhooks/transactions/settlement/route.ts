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
  status: z.enum(["SENT", "DETECTED", "CONFIRMED", "FAILED"]),
  amount: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  currency: z.enum(["INR", "USDT"]),
  provider: z.string().min(2).max(80),
  providerReference: z.string().min(2).max(160),
  txid: z.string().max(80).optional(),
  payoutReference: z.string().regex(/^[A-Za-z0-9/-]{6,60}$/).optional(),
  confirmations: z.number().int().min(0).max(10_000).optional(),
});

function requiredConfirmations() {
  const raw = process.env.SETTLEMENT_REQUIRED_CONFIRMATIONS;
  if (!raw && process.env.NODE_ENV === "production") return null;
  const value = Number(raw ?? "1");
  return Number.isInteger(value) && value > 0 && value <= 10_000 ? value : null;
}

async function markSettlementReview(
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
        attentionReason: reason.slice(0, 300),
        version: { increment: 1 },
      },
    });
    await tx.reconciliation.updateMany({
      where: { orderId: order.id, status: { not: "MATCHED" } },
      data: {
        status: "EXCEPTION",
        exceptionReason: reason.slice(0, 300),
      },
    });
    await auditWith(tx, {
      action: "order.settlement_event_conflict",
      entityType: "Order",
      entityId: order.id,
      orderId: order.id,
      actorId: null,
      actorLabel,
      meta: { from: order.status, to: "NEEDS_REVIEW", reason: reason.slice(0, 300) },
    });
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.SETTLEMENT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Settlement webhook is not configured." }, { status: 503 });
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
  const providerKey = `SETTLEMENT:${input.provider.toUpperCase()}`;
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
            settlementAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
            legs: {
              where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
              include: { assignments: { where: { status: "ACTIVE" } } },
            },
          },
        });
        if (!order) throw new Error("ORDER_NOT_FOUND");
        const attempt = order.settlementAttempts[0];
        if (!attempt) throw new Error("SETTLEMENT_ATTEMPT_NOT_FOUND");
        if (
          attempt.currency !== input.currency ||
          !attempt.amount.equals(new Prisma.Decimal(input.amount))
        ) {
          throw new Error("SETTLEMENT_AMOUNT_MISMATCH");
        }
        if (attempt.provider && attempt.provider !== input.provider) {
          throw new Error("SETTLEMENT_PROVIDER_MISMATCH");
        }

        const txid =
          input.txid && attempt.network
            ? normalizeTransactionHash(input.txid, attempt.network)
            : null;
        const payoutReference = input.payoutReference?.toUpperCase();
        if (attempt.currency === "USDT" && !txid) {
          throw new Error("SETTLEMENT_REFERENCE_INVALID");
        }
        if (attempt.currency === "INR" && !payoutReference) {
          throw new Error("SETTLEMENT_REFERENCE_INVALID");
        }
        if (input.status === "CONFIRMED" && attempt.currency === "USDT") {
          const required = requiredConfirmations();
          if (required === null) throw new Error("CONFIRMATIONS_NOT_CONFIGURED");
          if ((input.confirmations ?? -1) < required) {
            throw new Error("CONFIRMATIONS_INSUFFICIENT");
          }
        }

        const payoutHash = payoutReference
          ? financialFingerprint(payoutReference)
          : null;
        const conflict = await tx.settlementAttempt.findFirst({
          where: {
            id: { not: attempt.id },
            OR: [
              ...(txid ? [{ txid }] : []),
              ...(payoutHash ? [{ payoutReferenceHash: payoutHash }] : []),
            ],
          },
          select: { id: true },
        });
        if (conflict) throw new Error("SETTLEMENT_REFERENCE_CONFLICT");

        const eventRecord = {
          provider: providerKey,
          externalId: input.eventId,
          payloadHash: eventPayloadHash,
        };
        if (input.status === "FAILED") {
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
                attentionReason: "Settlement provider reported a failed or uncertain outcome.",
                version: { increment: 1 },
              },
            });
            await tx.settlementAttempt.update({
              where: { id: attempt.id },
              data: {
                status: "BLOCKED",
                failureReason: "Provider reported failed; pending exposure retained for review.",
              },
            });
            await auditWith(tx, {
              action: "order.settlement_provider_uncertain",
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

        await tx.settlementAttempt.update({
          where: { id: attempt.id },
          data: {
            provider: input.provider,
            providerReference: input.providerReference,
            status:
              input.status === "CONFIRMED"
                ? "CONFIRMED"
                : input.status === "DETECTED"
                  ? "DETECTED"
                  : "SENT",
            txid,
            ...(payoutReference
              ? {
                  payoutReferenceEncrypted: encryptSensitive(payoutReference),
                  payoutReferenceHash: payoutHash,
                  payoutReferenceMasked: maskReference(payoutReference),
                }
              : {}),
            sentAt: attempt.sentAt ?? new Date(),
            detectedAt:
              input.status === "DETECTED" || input.status === "CONFIRMED"
                ? attempt.detectedAt ?? new Date()
                : attempt.detectedAt,
            confirmedAt: input.status === "CONFIRMED" ? new Date() : attempt.confirmedAt,
          },
        });

        let status = order.status;
        if (status === "SETTLEMENT_IN_PROGRESS") {
          assertOrderTransition(status, "SETTLEMENT_SENT");
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "SETTLEMENT_SENT",
              settlementSentAt: new Date(),
              version: { increment: 1 },
            },
          });
          await tx.orderLeg.updateMany({
            where: { orderId: order.id, status: "SETTLEMENT_IN_PROGRESS" },
            data: { status: "SETTLEMENT_SENT" },
          });
          await auditWith(tx, {
            action: "order.settlement_sent",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: status, to: "SETTLEMENT_SENT" },
          });
          status = "SETTLEMENT_SENT";
        }
        if (
          (input.status === "DETECTED" || input.status === "CONFIRMED") &&
          status === "SETTLEMENT_SENT"
        ) {
          assertOrderTransition(status, "CONFIRMING");
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CONFIRMING", version: { increment: 1 } },
          });
          await tx.orderLeg.updateMany({
            where: { orderId: order.id, status: "SETTLEMENT_SENT" },
            data: { status: "CONFIRMING" },
          });
          await auditWith(tx, {
            action: "order.settlement_confirming",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: status, to: "CONFIRMING" },
          });
          status = "CONFIRMING";
        }

        if (input.status === "CONFIRMED" && status === "CONFIRMING") {
          if (order.legs.length !== 1 || order.legs[0].assignments.length !== 1) {
            throw new Error("ACTIVE_ASSIGNMENT_CONFLICT");
          }
          const assignment = order.legs[0].assignments[0];
          const capacityMoved = await tx.liquidityCapacity.updateMany({
            where: {
              id: assignment.liquidityCapacityId,
              pendingInr: { gte: assignment.reservedInr },
              pendingUsdt: { gte: assignment.reservedUsdt },
            },
            data: {
              pendingInr: { decrement: assignment.reservedInr },
              settledInr: { increment: assignment.reservedInr },
              pendingUsdt: { decrement: assignment.reservedUsdt },
              settledUsdt: { increment: assignment.reservedUsdt },
              version: { increment: 1 },
            },
          });
          if (capacityMoved.count !== 1) throw new Error("CAPACITY_CONFLICT");
          assertOrderTransition(status, "COMPLETED");
          await tx.assignment.update({
            where: { id: assignment.id },
            data: { status: "RELEASED", releasedAt: new Date() },
          });
          await tx.orderLeg.update({
            where: { id: order.legs[0].id },
            data: { status: "COMPLETED" },
          });
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              attentionReason: null,
              version: { increment: 1 },
            },
          });
          await tx.reconciliation.update({
            where: { orderId: order.id },
            data: {
              status: "MATCHED",
              settlementMatched: true,
              observedReceiveAmount: attempt.amount,
              reconciledAt: new Date(),
              exceptionReason: null,
            },
          });
          await auditWith(tx, {
            action: "order.completed",
            entityType: "Order",
            entityId: order.id,
            orderId: order.id,
            actorId: null,
            actorLabel: `${input.provider} webhook`,
            meta: { from: status, to: "COMPLETED", reconciliation: "MATCHED" },
          });
          status = "COMPLETED";
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
      await markSettlementReview(
        input.orderReference,
        `${input.provider} webhook`,
        "A settlement reference conflicted during concurrent processing.",
      );
      return NextResponse.json({ error: "Settlement reference conflict." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_NOT_FOUND" || message === "SETTLEMENT_ATTEMPT_NOT_FOUND") {
      return NextResponse.json({ error: "Settlement target not found." }, { status: 404 });
    }
    if (message === "CONFIRMATIONS_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Required confirmations are not configured." }, { status: 503 });
    }
    if (message === "CONFIRMATIONS_INSUFFICIENT") {
      return NextResponse.json({ error: "Required confirmations have not been reached." }, { status: 409 });
    }
    if (
      [
        "SETTLEMENT_AMOUNT_MISMATCH",
        "SETTLEMENT_PROVIDER_MISMATCH",
        "SETTLEMENT_REFERENCE_INVALID",
        "SETTLEMENT_REFERENCE_CONFLICT",
        "ACTIVE_ASSIGNMENT_CONFLICT",
        "CAPACITY_CONFLICT",
        "EVENT_REPLAY_CONFLICT",
      ].includes(message)
    ) {
      await markSettlementReview(
        input.orderReference,
        `${input.provider} webhook`,
        `Settlement event conflict: ${message}. Pending exposure was retained.`,
      );
      return NextResponse.json(
        { error: "Settlement event conflicts with the recorded order." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Settlement event could not be processed." }, { status: 500 });
  }
}
