"use server";

import { Prisma, type OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireAdminPermission,
  verifyAdminStepUp,
} from "@/lib/admin-permissions";
import { audit, auditWith } from "@/lib/audit";
import { db } from "@/lib/db";
import { doublePaymentBlockers } from "@/lib/double-payment-shield";
import {
  decryptSensitive,
  encryptSensitive,
  financialFingerprint,
  maskReference,
} from "@/lib/financial-crypto";
import { assertOrderTransition, TERMINAL_ORDER_STATUSES } from "@/lib/order-state-machine";
import { notify } from "@/lib/notify";
import { normalizeTransactionHash } from "@/lib/payment-validation";
import {
  releaseThroughSettlementProvider,
  settlementProviderConfigured,
} from "@/lib/settlement-provider";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function path(reference: string) {
  return `/admin/orders/${encodeURIComponent(reference)}`;
}

function fail(reference: string, message: string): never {
  redirect(`${path(reference)}?error=${encodeURIComponent(message)}`);
}

function done(reference: string, message: string): never {
  revalidatePath(path(reference));
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`${path(reference)}?notice=${encodeURIComponent(message)}`);
}

function reason(formData: FormData, reference: string) {
  const text = value(formData, "reason");
  if (text.length < 8 || text.length > 500) {
    fail(reference, "A specific reason of 8–500 characters is required.");
  }
  return text;
}

async function stepUp(
  permission: "ORDER_OPERATIONS" | "SETTLEMENT_RELEASE",
  formData: FormData,
  reference: string,
) {
  const admin = await requireAdminPermission(permission);
  try {
    await verifyAdminStepUp(admin, value(formData, "totpCode"));
  } catch (error) {
    fail(reference, error instanceof Error ? error.message : "Step-up verification failed.");
  }
  return admin;
}

function makerCheckerBlocks(paymentActorId: string | null, adminId: string) {
  return process.env.ORDER_MAKER_CHECKER_REQUIRED === "true" && paymentActorId === adminId;
}

export async function confirmOrderPayment(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await stepUp("ORDER_OPERATIONS", formData, reference);
  const actionReason = reason(formData, reference);

  await db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { reference },
        include: {
          paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
          legs: { where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } } },
        },
      });
      if (!order) fail(reference, "Order not found.");
      if (["PAYMENT_CONFIRMED", "SETTLEMENT_PENDING"].includes(order.status)) return;
      if (!["PAYMENT_SUBMITTED", "PAYMENT_DETECTED"].includes(order.status)) {
        fail(reference, "Payment can only be confirmed after submission or provider detection.");
      }
      const attempt = order.paymentAttempts[0];
      if (!attempt) fail(reference, "Payment attempt not found.");

      assertOrderTransition(order.status, "PAYMENT_CONFIRMED");
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_CONFIRMED",
          paymentConfirmedAt: new Date(),
          paymentConfirmedById: admin.id,
          version: { increment: 1 },
        },
      });
      await auditWith(tx, {
        action: "order.payment_confirmed",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: admin.id,
        actorLabel: "Operator",
        meta: { from: order.status, to: "PAYMENT_CONFIRMED", reason: actionReason },
      });

      assertOrderTransition("PAYMENT_CONFIRMED", "SETTLEMENT_PENDING");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "SETTLEMENT_PENDING", version: { increment: 1 } },
      });
      await tx.orderLeg.updateMany({
        where: { orderId: order.id, status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
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
        actorId: admin.id,
        actorLabel: "Operator",
        meta: { from: "PAYMENT_CONFIRMED", to: "SETTLEMENT_PENDING" },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  done(reference, "Payment confirmed. Order is ready to settle.");
}

type ReleaseContext = {
  orderId: string;
  reference: string;
  attemptId: string;
  attemptKey: string;
  amount: string;
  currency: "INR" | "USDT";
  network: "TRC20" | "ERC20" | "POLYGON" | null;
  destination: Record<string, string>;
};

async function destinationPayload(order: Prisma.OrderGetPayload<{
  include: {
    destinationPaymentMethod: {
      include: { bankAccount: true; upiHandle: true; wallet: true };
    };
  };
}>): Promise<Record<string, string>> {
  const method = order.destinationPaymentMethod;
  if (method.wallet) {
    return {
      network: String(method.wallet.network),
      address: decryptSensitive(method.wallet.addressEncrypted),
    };
  }
  if (method.upiHandle) {
    return { rail: "UPI", upiId: decryptSensitive(method.upiHandle.handleEncrypted) };
  }
  if (method.bankAccount) {
    return {
      rail: "IMPS",
      accountHolder: decryptSensitive(method.bankAccount.accountHolderEncrypted),
      accountNumber: decryptSensitive(method.bankAccount.accountNumberEncrypted),
      ifsc: decryptSensitive(method.bankAccount.ifscEncrypted),
      bankName: method.bankAccount.bankName,
    };
  }
  throw new Error("Settlement destination is incomplete.");
}

async function beginSettlementRelease(
  reference: string,
  adminId: string,
  actionReason: string,
): Promise<ReleaseContext> {
  const orderForDestination = await db.order.findUnique({
    where: { reference },
    include: {
      destinationPaymentMethod: {
        include: { bankAccount: true, upiHandle: true, wallet: true },
      },
    },
  });
  if (!orderForDestination) fail(reference, "Order not found.");
  const destination = await destinationPayload(orderForDestination);
  const network = orderForDestination.destinationPaymentMethod.wallet?.network ?? null;

  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderForDestination.id },
        include: {
          settlementAttempts: {
            include: { evidence: { select: { id: true } } },
          },
          paymentAttempts: true,
          legs: {
            where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: { evidence: { select: { id: true } } },
              },
            },
          },
        },
      });
      if (!order) fail(reference, "Order not found.");
      if (order.status !== "SETTLEMENT_PENDING") {
        fail(reference, "Settlement release requires a confirmed payment and pending settlement.");
      }
      if (makerCheckerBlocks(order.paymentConfirmedById, adminId)) {
        fail(reference, "Maker-checker is enabled: another authorised operator must release.");
      }
      const unresolvedAttempt = order.settlementAttempts.find(
        (attempt) =>
          attempt.status !== "CANCELLED" ||
          Boolean(attempt.txid) ||
          Boolean(attempt.payoutReferenceHash) ||
          attempt.evidence.length > 0,
      );
      if (unresolvedAttempt) {
        fail(reference, "A settlement attempt already exists. Inspect it before any new release.");
      }
      if (order.legs.length !== 1 || order.legs[0].assignments.length !== 1) {
        fail(reference, "Order legs or active assignments conflict. Open review.");
      }
      if (order.legs[0].assignments[0].evidence.length) {
        fail(reference, "Prior assignment proof exists. Release is blocked pending review.");
      }
      const assignment = order.legs[0].assignments[0];
      const capacityMoved = await tx.liquidityCapacity.updateMany({
        where: {
          id: assignment.liquidityCapacityId,
          reservedInr: { gte: assignment.reservedInr },
          reservedUsdt: { gte: assignment.reservedUsdt },
        },
        data: {
          reservedInr: { decrement: assignment.reservedInr },
          pendingInr: { increment: assignment.reservedInr },
          reservedUsdt: { decrement: assignment.reservedUsdt },
          pendingUsdt: { increment: assignment.reservedUsdt },
          version: { increment: 1 },
        },
      });
      if (capacityMoved.count !== 1) {
        fail(reference, "Capacity exposure is inconsistent. Release is blocked.");
      }

      assertOrderTransition(order.status, "SETTLEMENT_IN_PROGRESS");
      const attemptKey = `settle:${orderForDestination.id}:${order.settlementAttempts.length + 1}`;
      const attempt = await tx.settlementAttempt.create({
        data: {
          orderId: order.id,
          orderLegId: order.legs[0].id,
          status: "PENDING",
          amount: order.receiveAmount,
          currency: order.receiveCurrency,
          network,
          idempotencyKey: attemptKey,
          destinationMasked: orderForDestination.destinationPaymentMethod.maskedLabel,
          startedAt: new Date(),
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "SETTLEMENT_IN_PROGRESS",
          settlementReleasedById: adminId,
          version: { increment: 1 },
        },
      });
      await tx.orderLeg.update({
        where: { id: order.legs[0].id },
        data: { status: "SETTLEMENT_IN_PROGRESS" },
      });
      await auditWith(tx, {
        action: "order.settlement_released",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: adminId,
        actorLabel: "Operator",
        meta: {
          from: order.status,
          to: "SETTLEMENT_IN_PROGRESS",
          reason: actionReason,
          provider: "configured",
        },
      });
      return {
        orderId: order.id,
        reference: order.reference,
        attemptId: attempt.id,
        attemptKey,
        amount: order.receiveAmount.toString(),
        currency: order.receiveCurrency as "INR" | "USDT",
        network,
        destination,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function releaseOrderSettlement(formData: FormData) {
  const reference = value(formData, "reference");
  if (!settlementProviderConfigured()) {
    fail(
      reference,
      "No real settlement provider is configured. Use manual record only after an actual external transfer.",
    );
  }
  const admin = await stepUp("SETTLEMENT_RELEASE", formData, reference);
  const actionReason = reason(formData, reference);
  const context = await beginSettlementRelease(reference, admin.id, actionReason);

  try {
    const result = await releaseThroughSettlementProvider({
      idempotencyKey: context.attemptKey,
      orderReference: context.reference,
      amount: context.amount,
      currency: context.currency,
      destination: context.destination,
    });
    const normalizedTxid =
      result.txid && context.network
        ? normalizeTransactionHash(result.txid, context.network)
        : result.txid;
    if (result.txid && !normalizedTxid) throw new Error("Provider returned an invalid TXID.");

    await db.$transaction(async (tx) => {
      await tx.settlementAttempt.update({
        where: { id: context.attemptId },
        data: {
          provider: result.provider,
          providerReference: result.reference,
          status: result.status === "SENT" ? "SENT" : "IN_PROGRESS",
          txid: normalizedTxid ?? null,
          sentAt: result.status === "SENT" ? new Date() : null,
        },
      });
      if (result.status === "SENT") {
        assertOrderTransition("SETTLEMENT_IN_PROGRESS", "SETTLEMENT_SENT");
        await tx.order.update({
          where: { id: context.orderId },
          data: {
            status: "SETTLEMENT_SENT",
            settlementSentAt: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.orderLeg.updateMany({
          where: { orderId: context.orderId, status: "SETTLEMENT_IN_PROGRESS" },
          data: { status: "SETTLEMENT_SENT" },
        });
        await auditWith(tx, {
          action: "order.settlement_sent",
          entityType: "Order",
          entityId: context.orderId,
          orderId: context.orderId,
          actorId: admin.id,
          actorLabel: "Settlement provider",
          meta: {
            from: "SETTLEMENT_IN_PROGRESS",
            to: "SETTLEMENT_SENT",
            providerReference: result.reference,
            txidRecorded: Boolean(normalizedTxid),
          },
        });
        assertOrderTransition("SETTLEMENT_SENT", "CONFIRMING");
        await tx.order.update({
          where: { id: context.orderId },
          data: { status: "CONFIRMING", version: { increment: 1 } },
        });
        await tx.orderLeg.updateMany({
          where: { orderId: context.orderId, status: "SETTLEMENT_SENT" },
          data: { status: "CONFIRMING" },
        });
      }
      await auditWith(tx, {
        action:
          result.status === "SENT"
            ? "order.settlement_confirming"
            : "order.settlement_provider_accepted",
        entityType: "Order",
        entityId: context.orderId,
        orderId: context.orderId,
        actorId: admin.id,
        actorLabel: "Operator",
        meta: {
          provider: result.provider,
          providerReference: result.reference,
          txidRecorded: Boolean(normalizedTxid),
          ...(result.status === "SENT"
            ? { from: "SETTLEMENT_SENT", to: "CONFIRMING" }
            : {}),
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settlement provider failed.";
    await db.$transaction(async (tx) => {
      await tx.settlementAttempt.updateMany({
        where: { id: context.attemptId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "BLOCKED", failureReason: message.slice(0, 300) },
      });
      await tx.order.update({
        where: { id: context.orderId },
        data: {
          status: "NEEDS_REVIEW",
          attentionReason: "Settlement provider outcome requires review.",
          version: { increment: 1 },
        },
      });
      await auditWith(tx, {
        action: "order.settlement_provider_uncertain",
        entityType: "Order",
        entityId: context.orderId,
        orderId: context.orderId,
        actorId: admin.id,
        actorLabel: "Operator",
        meta: { reason: message.slice(0, 300) },
      });
    });
    fail(reference, `${message} Capacity remains pending until review.`);
  }
  done(reference, "Settlement released through the configured provider.");
}

export async function recordManualSettlementSent(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await stepUp("SETTLEMENT_RELEASE", formData, reference);
  const actionReason = reason(formData, reference);
  if (value(formData, "executionConfirmed") !== "confirmed") {
    fail(reference, "Confirm that an irreversible external transfer actually occurred.");
  }

  const order = await db.order.findUnique({
    where: { reference },
    include: {
      destinationPaymentMethod: { include: { wallet: true } },
    },
  });
  if (!order) fail(reference, "Order not found.");
  const network = order.destinationPaymentMethod.wallet?.network;
  const txidRaw = value(formData, "txid");
  const payoutRaw = value(formData, "payoutReference").toUpperCase();
  const txid = network && txidRaw ? normalizeTransactionHash(txidRaw, network) : null;
  if (order.receiveCurrency === "USDT" && !txid) {
    fail(reference, "A valid network transaction ID is required for a USDT settlement.");
  }
  if (
    order.receiveCurrency === "INR" &&
    !/^[A-Z0-9/-]{6,60}$/.test(payoutRaw)
  ) {
    fail(reference, "A valid payout reference is required for an INR settlement.");
  }

  const context = await beginSettlementRelease(reference, admin.id, actionReason);
  try {
    await db.$transaction(
      async (tx) => {
        await tx.settlementAttempt.update({
          where: { id: context.attemptId },
          data: {
            provider: "MANUAL_EXTERNAL",
            status: "SENT",
            txid,
            ...(payoutRaw
              ? {
                  payoutReferenceEncrypted: encryptSensitive(payoutRaw),
                  payoutReferenceHash: financialFingerprint(payoutRaw),
                  payoutReferenceMasked: maskReference(payoutRaw),
                }
              : {}),
            sentAt: new Date(),
          },
        });
        assertOrderTransition("SETTLEMENT_IN_PROGRESS", "SETTLEMENT_SENT");
        await tx.order.update({
          where: { id: context.orderId },
          data: {
            status: "SETTLEMENT_SENT",
            settlementSentAt: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.orderLeg.updateMany({
          where: { orderId: context.orderId, status: "SETTLEMENT_IN_PROGRESS" },
          data: { status: "SETTLEMENT_SENT" },
        });
        await auditWith(tx, {
          action: "order.manual_settlement_sent",
          entityType: "Order",
          entityId: context.orderId,
          orderId: context.orderId,
          actorId: admin.id,
          actorLabel: "Operator",
          meta: {
            from: "SETTLEMENT_IN_PROGRESS",
            to: "SETTLEMENT_SENT",
            reason: actionReason,
            txidRecorded: Boolean(txid),
            payoutReferenceRecorded: Boolean(payoutRaw),
          },
        });
        assertOrderTransition("SETTLEMENT_SENT", "CONFIRMING");
        await tx.order.update({
          where: { id: context.orderId },
          data: { status: "CONFIRMING", version: { increment: 1 } },
        });
        await tx.orderLeg.updateMany({
          where: { orderId: context.orderId, status: "SETTLEMENT_SENT" },
          data: { status: "CONFIRMING" },
        });
        await auditWith(tx, {
          action: "order.manual_settlement_recorded",
          entityType: "Order",
          entityId: context.orderId,
          orderId: context.orderId,
          actorId: admin.id,
          actorLabel: "Operator",
          meta: {
            from: "SETTLEMENT_SENT",
            to: "CONFIRMING",
            reason: actionReason,
            txidRecorded: Boolean(txid),
            payoutReferenceRecorded: Boolean(payoutRaw),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await db.$transaction(async (tx) => {
        assertOrderTransition("SETTLEMENT_IN_PROGRESS", "NEEDS_REVIEW");
        await tx.settlementAttempt.updateMany({
          where: { id: context.attemptId },
          data: {
            status: "BLOCKED",
            failureReason: "TXID or payout reference conflicts with another settlement.",
          },
        });
        await tx.order.update({
          where: { id: context.orderId },
          data: {
            status: "NEEDS_REVIEW",
            attentionReason: "Settlement reference is already used.",
            version: { increment: 1 },
          },
        });
        await auditWith(tx, {
          action: "order.settlement_reference_conflict",
          entityType: "Order",
          entityId: context.orderId,
          orderId: context.orderId,
          actorId: admin.id,
          actorLabel: "Operator",
          meta: { from: "SETTLEMENT_IN_PROGRESS", to: "NEEDS_REVIEW" },
        });
      });
      fail(reference, "That TXID or payout reference is already used. The order is blocked.");
    }
    throw error;
  }
  done(reference, "External settlement recorded. Confirmation is still required.");
}

export async function confirmOrderSettlement(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await stepUp("SETTLEMENT_RELEASE", formData, reference);
  const actionReason = reason(formData, reference);

  await db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { reference },
        include: {
          settlementAttempts: {
            where: { status: { in: ["SENT", "DETECTED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          legs: {
            where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
            include: { assignments: { where: { status: "ACTIVE" } } },
          },
        },
      });
      if (!order) fail(reference, "Order not found.");
      if (order.status === "COMPLETED") return;
      if (!["SETTLEMENT_SENT", "CONFIRMING"].includes(order.status)) {
        fail(reference, "Only a sent settlement can be confirmed.");
      }
      if (
        process.env.ORDER_MAKER_CHECKER_REQUIRED === "true" &&
        order.settlementReleasedById === admin.id
      ) {
        fail(reference, "Maker-checker is enabled: another operator must confirm settlement.");
      }
      const attempt = order.settlementAttempts[0];
      const assignment = order.legs[0]?.assignments[0];
      if (!attempt || !assignment || order.legs.length !== 1) {
        fail(reference, "Settlement attempt or active assignment is inconsistent.");
      }
      if (attempt.currency === "USDT" && !attempt.txid) {
        fail(reference, "USDT completion requires a transaction ID.");
      }
      if (attempt.currency === "INR" && !attempt.payoutReferenceHash) {
        fail(reference, "INR completion requires a payout reference.");
      }
      assertOrderTransition(order.status, "COMPLETED");

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
      if (capacityMoved.count !== 1) {
        fail(reference, "Pending capacity exposure is inconsistent. Completion is blocked.");
      }

      await tx.settlementAttempt.update({
        where: { id: attempt.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
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
          paymentMatched: true,
          settlementMatched: true,
          observedReceiveAmount: attempt.amount,
          reconciledById: admin.id,
          reconciledAt: new Date(),
          exceptionReason: null,
        },
      });
      await auditWith(tx, {
        action: "order.completed",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: admin.id,
        actorLabel: "Operator",
        meta: {
          from: order.status,
          to: "COMPLETED",
          reason: actionReason,
          reconciliation: "MATCHED",
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  done(reference, "Settlement confirmed, capacity reconciled and order completed.");
}

export async function openOrderReview(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await stepUp("ORDER_OPERATIONS", formData, reference);
  const actionReason = reason(formData, reference);
  const order = await db.order.findUnique({ where: { reference } });
  if (!order) fail(reference, "Order not found.");
  if ((TERMINAL_ORDER_STATUSES as readonly OrderStatus[]).includes(order.status)) {
    fail(reference, "A terminal order cannot be paused into review.");
  }
  assertOrderTransition(order.status, "NEEDS_REVIEW");
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "NEEDS_REVIEW",
        attentionReason: actionReason,
        version: { increment: 1 },
      },
    });
    await auditWith(tx, {
      action: "order.review_opened",
      entityType: "Order",
      entityId: order.id,
      orderId: order.id,
      actorId: admin.id,
      actorLabel: "Operator",
      meta: { from: order.status, to: "NEEDS_REVIEW", reason: actionReason },
    });
  });
  done(reference, "Order paused and review opened.");
}

export async function reassignOrderLiquidity(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await stepUp("ORDER_OPERATIONS", formData, reference);
  const actionReason = reason(formData, reference);
  const newCapacityId = value(formData, "capacityId");
  const order = await db.order.findUnique({
    where: { reference },
    include: {
      customer: { include: { user: true } },
      sourcePaymentMethod: { include: { wallet: true } },
      destinationPaymentMethod: { include: { wallet: true } },
      paymentAttempts: true,
      settlementAttempts: true,
      legs: {
        where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { evidence: { select: { id: true } } },
          },
        },
      },
    },
  });
  if (!order) fail(reference, "Order not found.");
  if (order.status !== "AWAITING_PAYMENT") {
    fail(reference, "Automatic reassignment is allowed only before payment is submitted.");
  }
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
    assignments: order.legs.flatMap((leg) =>
      leg.assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status,
        evidenceCount: assignment.evidence.length,
      })),
    ),
    activeLegCount: order.legs.length,
  });
  if (blockers.length) {
    fail(
      reference,
      `Reassignment blocked: ${blockers.map((blocker) => blocker.message).join(" ")} Open review; never retry settlement blindly.`,
    );
  }
  if (order.legs.length !== 1 || order.legs[0].assignments.length !== 1) {
    fail(reference, "Active leg or assignment is inconsistent.");
  }

  const inrAmount =
    order.sendCurrency === "INR" ? order.sendAmount : order.receiveAmount;
  const usdtAmount =
    order.sendCurrency === "USDT" ? order.sendAmount : order.receiveAmount;
  const rail =
    order.sourcePaymentMethod.type === "USDT_WALLET"
      ? "BLOCKCHAIN"
      : order.sourcePaymentMethod.type === "UPI_HANDLE"
        ? "UPI"
        : "IMPS";
  const network =
    order.sourcePaymentMethod.wallet?.network ??
    order.destinationPaymentMethod.wallet?.network ??
    null;
  const paymentWindow = new Date(
    Date.now() + Math.min(60, Math.max(5, Number(process.env.ORDER_PAYMENT_WINDOW_MINUTES ?? "15"))) * 60_000,
  );

  const newCapacity = await db.liquidityCapacity.findFirst({
    where: {
      id: newCapacityId,
      direction: order.direction,
      status: "AVAILABLE",
      availableUntil: { gt: paymentWindow },
      availableInr: { gte: inrAmount },
      availableUsdt: { gte: usdtAmount },
      rails: { has: rail },
      ...(network ? { networks: { has: network } } : {}),
      AND: [
        { OR: [{ minInr: null }, { minInr: { lte: inrAmount } }] },
        { OR: [{ maxInr: null }, { maxInr: { gte: inrAmount } }] },
        { OR: [{ minUsdt: null }, { minUsdt: { lte: usdtAmount } }] },
        { OR: [{ maxUsdt: null }, { maxUsdt: { gte: usdtAmount } }] },
      ],
      partner: {
        status: "VERIFIED",
        verificationCases: {
          some: { status: "APPROVED", expiresAt: { gt: new Date() } },
        },
      },
    },
  });
  if (!newCapacity) fail(reference, "Selected replacement capacity is no longer eligible.");

  const oldAssignment = order.legs[0].assignments[0];
  if (oldAssignment.liquidityCapacityId === newCapacity.id) {
    fail(reference, "Select a different capacity.");
  }
  await db.$transaction(
    async (tx) => {
      const reserved = await tx.liquidityCapacity.updateMany({
        where: {
          id: newCapacity.id,
          version: newCapacity.version,
          status: "AVAILABLE",
          availableUntil: { gt: paymentWindow },
          availableInr: { gte: inrAmount },
          availableUsdt: { gte: usdtAmount },
        },
        data: {
          availableInr: { decrement: inrAmount },
          reservedInr: { increment: inrAmount },
          availableUsdt: { decrement: usdtAmount },
          reservedUsdt: { increment: usdtAmount },
          version: { increment: 1 },
        },
      });
      if (reserved.count !== 1) fail(reference, "Replacement capacity changed. Retry selection.");

      const released = await tx.liquidityCapacity.updateMany({
        where: {
          id: oldAssignment.liquidityCapacityId,
          reservedInr: { gte: oldAssignment.reservedInr },
          reservedUsdt: { gte: oldAssignment.reservedUsdt },
        },
        data: {
          reservedInr: { decrement: oldAssignment.reservedInr },
          availableInr: { increment: oldAssignment.reservedInr },
          reservedUsdt: { decrement: oldAssignment.reservedUsdt },
          availableUsdt: { increment: oldAssignment.reservedUsdt },
          version: { increment: 1 },
        },
      });
      if (released.count !== 1) fail(reference, "Previous capacity exposure is inconsistent.");

      await tx.assignment.update({
        where: { id: oldAssignment.id },
        data: { status: "FROZEN", frozenAt: new Date(), frozenReason: actionReason },
      });
      await tx.orderLeg.update({
        where: { id: order.legs[0].id },
        data: { status: "FROZEN" },
      });
      await tx.paymentAttempt.updateMany({
        where: { orderLegId: order.legs[0].id, status: "INSTRUCTIONS_ISSUED" },
        data: { status: "EXPIRED" },
      });

      const latest = await tx.orderLeg.aggregate({
        where: { orderId: order.id },
        _max: { sequence: true },
      });
      const leg = await tx.orderLeg.create({
        data: {
          orderId: order.id,
          sequence: (latest._max.sequence ?? 0) + 1,
          status: "AWAITING_PAYMENT",
          sendAmount: order.sendAmount,
          receiveAmount: order.receiveAmount,
        },
      });
      await tx.assignment.create({
        data: {
          orderLegId: leg.id,
          partnerId: newCapacity.partnerId,
          liquidityCapacityId: newCapacity.id,
          previousAssignmentId: oldAssignment.id,
          reservedInr: inrAmount,
          reservedUsdt: usdtAmount,
          idempotencyKey: `reassign:${order.id}:${leg.sequence}`,
        },
      });
      await tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          orderLegId: leg.id,
          status: "INSTRUCTIONS_ISSUED",
          rail,
          amount: order.sendAmount,
          currency: order.sendCurrency,
          instructionsEncrypted: newCapacity.collectionDetailsEncrypted,
          instructionsMasked: newCapacity.collectionDetailsMasked,
          expiresAt: paymentWindow,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentDeadline: paymentWindow,
          attentionReason: null,
          version: { increment: 1 },
        },
      });
      await auditWith(tx, {
        action: "order.liquidity_reassigned",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: admin.id,
        actorLabel: "Operator",
        partnerId: newCapacity.partnerId,
        meta: {
          previousAssignmentId: oldAssignment.id,
          newCapacityId: newCapacity.id,
          reason: actionReason,
          irreversibleActionChecked: true,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await notify(order.customer.userId, {
    title: "Payment instructions updated",
    body: "Your move has new payment instructions. Do not use any previous beneficiary details.",
    telegramHtml:
      "⚠️ <b>Payment instructions updated</b>\nDo not use any previous beneficiary details. Open the order for the current instructions.",
    link: `/orders/${order.reference}`,
  });
  done(reference, "Assignment safely replaced; previous instructions were frozen.");
}

export async function grantRiskOverride(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await requireAdminPermission("RISK_OVERRIDE");
  try {
    await verifyAdminStepUp(admin, value(formData, "totpCode"));
  } catch (error) {
    fail(reference, error instanceof Error ? error.message : "Step-up verification failed.");
  }
  const actionReason = reason(formData, reference);
  const order = await db.order.findUnique({ where: { reference } });
  if (!order) fail(reference, "Order not found.");
  await audit({
    action: "order.risk_override_recorded",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    actorId: admin.id,
    actorLabel: "Risk override",
    meta: { reason: actionReason, statusChanged: false, fundsMoved: false },
  });
  done(reference, "Elevated review finding recorded. No funds or status were changed.");
}

const RISK_RESOLUTIONS = [
  "RETURN_TO_PAYMENT",
  "VERIFY_PAYMENT",
  "RESUME_CONFIRMING",
  "RETRY_SETTLEMENT",
] as const;
type RiskResolution = (typeof RISK_RESOLUTIONS)[number];

export async function resolveOrderRiskReview(formData: FormData) {
  const reference = value(formData, "reference");
  const admin = await requireAdminPermission("RISK_OVERRIDE");
  try {
    await verifyAdminStepUp(admin, value(formData, "totpCode"));
  } catch (error) {
    fail(reference, error instanceof Error ? error.message : "Step-up verification failed.");
  }
  const actionReason = reason(formData, reference);
  const resolution = value(formData, "resolution") as RiskResolution;
  if (!RISK_RESOLUTIONS.includes(resolution)) {
    fail(reference, "Choose a supported review resolution.");
  }
  if (value(formData, "independentCheck") !== "confirmed") {
    fail(reference, "Confirm the independent bank, network or provider check.");
  }

  const outcome = await db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { reference },
        include: {
          customer: { select: { userId: true } },
          paymentAttempts: {
            orderBy: { createdAt: "desc" },
            include: { evidence: { select: { id: true } } },
          },
          settlementAttempts: {
            orderBy: { createdAt: "desc" },
            include: { evidence: { select: { id: true } } },
          },
          legs: {
            where: { status: { notIn: ["FROZEN", "CANCELLED", "FAILED"] } },
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: {
                  evidence: { select: { id: true } },
                  liquidityCapacity: true,
                },
              },
            },
          },
        },
      });
      if (!order) fail(reference, "Order not found.");
      if (order.status !== "NEEDS_REVIEW") {
        fail(reference, "Exceptional resolution is available only while an order needs review.");
      }
      if (order.legs.length !== 1 || order.legs[0].assignments.length !== 1) {
        fail(reference, "Active order legs or assignments conflict. Review cannot be resolved.");
      }

      const leg = order.legs[0];
      const assignment = leg.assignments[0];
      const capacity = assignment.liquidityCapacity;
      const payment = order.paymentAttempts[0];
      const settlement = order.settlementAttempts[0];
      const hasAssignmentEvidence = assignment.evidence.length > 0;
      let nextStatus: OrderStatus;
      let notice: string;

      if (resolution === "RETURN_TO_PAYMENT") {
        if (
          !payment ||
          payment.status !== "INSTRUCTIONS_ISSUED" ||
          payment.utrHash ||
          payment.txid ||
          payment.providerReference ||
          payment.evidence.length ||
          order.paymentAttempts.some((attempt) =>
            Boolean(attempt.utrHash || attempt.txid || attempt.providerReference),
          ) ||
          order.settlementAttempts.length ||
          hasAssignmentEvidence
        ) {
          fail(reference, "Payment cannot resume because a payment or transfer signal exists.");
        }
        const paymentWindow = new Date(
          Date.now() +
            Math.min(
              60,
              Math.max(5, Number(process.env.ORDER_PAYMENT_WINDOW_MINUTES ?? "15")),
            ) *
              60_000,
        );
        if (
          capacity.status !== "AVAILABLE" ||
          capacity.availableUntil <= paymentWindow ||
          capacity.reservedInr.lt(assignment.reservedInr) ||
          capacity.reservedUsdt.lt(assignment.reservedUsdt)
        ) {
          fail(reference, "Reserved capacity is no longer eligible for a new payment window.");
        }
        assertOrderTransition("NEEDS_REVIEW", "AWAITING_PAYMENT");
        await tx.paymentAttempt.update({
          where: { id: payment.id },
          data: { expiresAt: paymentWindow },
        });
        await tx.orderLeg.update({
          where: { id: leg.id },
          data: { status: "AWAITING_PAYMENT" },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "AWAITING_PAYMENT",
            paymentDeadline: paymentWindow,
            attentionReason: null,
            version: { increment: 1 },
          },
        });
        nextStatus = "AWAITING_PAYMENT";
        notice = "Review resolved. A fresh payment window is active.";
      } else if (resolution === "VERIFY_PAYMENT") {
        const hasPaymentReference =
          payment &&
          Boolean(
            payment.providerReference ||
              (payment.rail === "BLOCKCHAIN" ? payment.txid : payment.utrHash),
          );
        if (
          !payment ||
          !["SUBMITTED", "DETECTED", "CONFIRMED"].includes(payment.status) ||
          !hasPaymentReference ||
          !payment.amount.equals(order.sendAmount) ||
          payment.currency !== order.sendCurrency ||
          order.settlementAttempts.length ||
          hasAssignmentEvidence ||
          capacity.reservedInr.lt(assignment.reservedInr) ||
          capacity.reservedUsdt.lt(assignment.reservedUsdt)
        ) {
          fail(
            reference,
            "Payment cannot be verified from this review state. Amount, reference or exposure is inconsistent.",
          );
        }
        assertOrderTransition("NEEDS_REVIEW", "PAYMENT_CONFIRMED");
        await tx.paymentAttempt.update({
          where: { id: payment.id },
          data: { status: "CONFIRMED", confirmedAt: payment.confirmedAt ?? new Date() },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_CONFIRMED",
            paymentConfirmedAt: order.paymentConfirmedAt ?? new Date(),
            paymentConfirmedById: admin.id,
            attentionReason: null,
            version: { increment: 1 },
          },
        });
        assertOrderTransition("PAYMENT_CONFIRMED", "SETTLEMENT_PENDING");
        await tx.order.update({
          where: { id: order.id },
          data: { status: "SETTLEMENT_PENDING", version: { increment: 1 } },
        });
        await tx.orderLeg.update({
          where: { id: leg.id },
          data: { status: "SETTLEMENT_PENDING" },
        });
        await tx.reconciliation.update({
          where: { orderId: order.id },
          data: {
            status: "PENDING",
            paymentMatched: true,
            observedSendAmount: payment.amount,
            exceptionReason: null,
          },
        });
        nextStatus = "SETTLEMENT_PENDING";
        notice = "Payment independently verified. Order is ready to settle.";
      } else if (resolution === "RESUME_CONFIRMING") {
        if (
          order.settlementAttempts.length !== 1 ||
          !settlement ||
          !["SENT", "DETECTED"].includes(settlement.status) ||
          (settlement.currency === "USDT" ? !settlement.txid : !settlement.payoutReferenceHash) ||
          capacity.pendingInr.lt(assignment.reservedInr) ||
          capacity.pendingUsdt.lt(assignment.reservedUsdt)
        ) {
          fail(reference, "A unique sent settlement and pending exposure are required.");
        }
        if (makerCheckerBlocks(order.settlementReleasedById, admin.id)) {
          fail(reference, "Maker-checker is enabled: another operator must resolve this review.");
        }
        assertOrderTransition("NEEDS_REVIEW", "CONFIRMING");
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMING",
            attentionReason: null,
            version: { increment: 1 },
          },
        });
        await tx.orderLeg.update({
          where: { id: leg.id },
          data: { status: "CONFIRMING" },
        });
        nextStatus = "CONFIRMING";
        notice = "Verified settlement restored to confirmation.";
      } else {
        if (
          order.settlementAttempts.length !== 1 ||
          !settlement ||
          !["BLOCKED", "FAILED", "CANCELLED"].includes(settlement.status) ||
          settlement.txid ||
          settlement.payoutReferenceHash ||
          settlement.evidence.length ||
          hasAssignmentEvidence ||
          capacity.pendingInr.lt(assignment.reservedInr) ||
          capacity.pendingUsdt.lt(assignment.reservedUsdt)
        ) {
          fail(
            reference,
            "Settlement cannot be retried until the prior provider confirms no transfer and no proof or reference exists.",
          );
        }
        if (makerCheckerBlocks(order.settlementReleasedById, admin.id)) {
          fail(reference, "Maker-checker is enabled: another operator must resolve this review.");
        }
        const exposureMoved = await tx.liquidityCapacity.updateMany({
          where: {
            id: capacity.id,
            version: capacity.version,
            pendingInr: { gte: assignment.reservedInr },
            pendingUsdt: { gte: assignment.reservedUsdt },
          },
          data: {
            pendingInr: { decrement: assignment.reservedInr },
            reservedInr: { increment: assignment.reservedInr },
            pendingUsdt: { decrement: assignment.reservedUsdt },
            reservedUsdt: { increment: assignment.reservedUsdt },
            version: { increment: 1 },
          },
        });
        if (exposureMoved.count !== 1) {
          fail(reference, "Pending capacity changed. Review remains blocked.");
        }
        await tx.settlementAttempt.update({
          where: { id: settlement.id },
          data: { status: "CANCELLED" },
        });
        assertOrderTransition("NEEDS_REVIEW", "SETTLEMENT_PENDING");
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "SETTLEMENT_PENDING",
            settlementReleasedById: null,
            settlementSentAt: null,
            attentionReason: null,
            version: { increment: 1 },
          },
        });
        await tx.orderLeg.update({
          where: { id: leg.id },
          data: { status: "SETTLEMENT_PENDING" },
        });
        await tx.reconciliation.update({
          where: { orderId: order.id },
          data: {
            status: "PENDING",
            settlementMatched: false,
            observedReceiveAmount: null,
            exceptionReason: null,
          },
        });
        nextStatus = "SETTLEMENT_PENDING";
        notice = "No-transfer outcome recorded. Settlement may be released with a new idempotency key.";
      }

      await auditWith(tx, {
        action: "order.risk_review_resolved",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: admin.id,
        actorLabel: "Risk override",
        meta: {
          from: "NEEDS_REVIEW",
          to: nextStatus,
          resolution,
          reason: actionReason,
          paymentAttemptId: payment?.id ?? null,
          settlementAttemptId: settlement?.id ?? null,
          independentCheckConfirmed: true,
        },
      });
      return { notice, userId: order.customer.userId, nextStatus };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await notify(outcome.userId, {
    title: outcome.nextStatus === "AWAITING_PAYMENT" ? "Payment window reopened" : "Order review updated",
    body:
      outcome.nextStatus === "AWAITING_PAYMENT"
        ? "Operations reopened your payment window. Use only the current order instructions."
        : "Operations completed a controlled review. Open your order for its current status.",
    telegramHtml:
      outcome.nextStatus === "AWAITING_PAYMENT"
        ? "↔ <b>Payment window reopened</b>\nUse only the current order instructions."
        : "↔ <b>Order review updated</b>\nOpen your order for its current status.",
    link: `/orders/${reference}`,
  });
  done(reference, outcome.notice);
}
