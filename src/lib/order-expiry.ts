import "server-only";

import { Prisma } from "@prisma/client";
import { auditWith } from "@/lib/audit";
import { db } from "@/lib/db";
import { assertOrderTransition } from "@/lib/order-state-machine";

/**
 * Lazily expires a genuinely unpaid order. Any customer payment signal moves
 * the order out of AWAITING_PAYMENT first, so late/uncertain money is never
 * silently released back into capacity by this path.
 */
export async function expireUnpaidOrder(reference: string, customerId?: string) {
  const candidate = await db.order.findFirst({
    where: {
      reference,
      ...(customerId ? { customerId } : {}),
      status: "AWAITING_PAYMENT",
      paymentDeadline: { lte: new Date() },
    },
    select: { id: true, version: true },
  });
  if (!candidate) return false;

  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: candidate.id,
          version: candidate.version,
          status: "AWAITING_PAYMENT",
          paymentDeadline: { lte: new Date() },
        },
        include: {
          paymentAttempts: {
            where: { status: { in: ["CREATED", "INSTRUCTIONS_ISSUED"] } },
          },
          legs: {
            where: { status: "AWAITING_PAYMENT" },
            include: { assignments: { where: { status: "ACTIVE" } } },
          },
        },
      });
      if (!order || order.legs.length !== 1 || order.legs[0].assignments.length !== 1) {
        return false;
      }

      const assignment = order.legs[0].assignments[0];
      assertOrderTransition(order.status, "EXPIRED");
      const released = await tx.liquidityCapacity.updateMany({
        where: {
          id: assignment.liquidityCapacityId,
          reservedInr: { gte: assignment.reservedInr },
          reservedUsdt: { gte: assignment.reservedUsdt },
        },
        data: {
          reservedInr: { decrement: assignment.reservedInr },
          availableInr: { increment: assignment.reservedInr },
          reservedUsdt: { decrement: assignment.reservedUsdt },
          availableUsdt: { increment: assignment.reservedUsdt },
          version: { increment: 1 },
        },
      });
      if (released.count !== 1) {
        throw new Error("Expired order capacity could not be reconciled.");
      }

      await tx.paymentAttempt.updateMany({
        where: {
          id: { in: order.paymentAttempts.map((attempt) => attempt.id) },
        },
        data: { status: "EXPIRED" },
      });
      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: "CANCELLED",
          frozenAt: new Date(),
          frozenReason: "Customer payment window expired without a payment signal.",
        },
      });
      await tx.orderLeg.update({
        where: { id: order.legs[0].id },
        data: { status: "CANCELLED" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "EXPIRED",
          attentionReason: null,
          version: { increment: 1 },
        },
      });
      await auditWith(tx, {
        action: "order.payment_window_expired",
        entityType: "Order",
        entityId: order.id,
        orderId: order.id,
        actorId: null,
        actorLabel: "System",
        meta: {
          from: order.status,
          to: "EXPIRED",
          capacityReservation: "released",
        },
      });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
