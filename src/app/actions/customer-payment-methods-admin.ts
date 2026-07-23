"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireAdminPermission,
  verifyAdminStepUp,
} from "@/lib/admin-permissions";
import { auditWith } from "@/lib/audit";
import { db } from "@/lib/db";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function fail(message: string): never {
  redirect(`/admin/customer-methods?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  revalidatePath("/admin/customer-methods");
  revalidatePath("/admin");
  redirect(`/admin/customer-methods?notice=${encodeURIComponent(message)}`);
}

export async function reviewCustomerPaymentMethod(formData: FormData) {
  const admin = await requireAdminPermission("ORDER_OPERATIONS");
  try {
    await verifyAdminStepUp(admin, value(formData, "totpCode"));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Step-up verification failed.");
  }
  const methodId = value(formData, "methodId");
  const decision = value(formData, "decision");
  const reason = value(formData, "reason");
  const providerReference = value(formData, "providerReference");
  if (!["verify", "reject"].includes(decision)) fail("Choose a valid review decision.");
  if (reason.length < 8 || reason.length > 500) {
    fail("A specific reason of 8–500 characters is required.");
  }
  if (decision === "verify" && (providerReference.length < 3 || providerReference.length > 160)) {
    fail("Record the independent bank, provider, or wallet-challenge reference.");
  }

  await db.$transaction(
    async (tx) => {
      const method = await tx.paymentMethod.findUnique({
        where: { id: methodId },
        include: {
          bankAccount: true,
          upiHandle: true,
          wallet: true,
          customer: true,
          primaryForProfile: true,
        },
      });
      if (!method) fail("Payment method not found.");
      if (
        decision === "verify" &&
        !["UNVERIFIED", "FORMAT_VALIDATED", "OWNERSHIP_VERIFIED"].includes(method.status)
      ) {
        fail("This payment method cannot be verified from its current state.");
      }
      if (decision === "reject" && method.status === "DISABLED") {
        fail("A disabled method cannot be reviewed.");
      }

      const status = decision === "verify" ? "OWNERSHIP_VERIFIED" : "REJECTED";
      await tx.paymentMethod.update({
        where: { id: method.id },
        data: { status },
      });
      if (method.bankAccount) {
        await tx.bankAccount.update({
          where: { paymentMethodId: method.id },
          data: {
            ownershipVerifiedAt: decision === "verify" ? new Date() : null,
          },
        });
      }
      if (method.upiHandle) {
        await tx.uPIHandle.update({
          where: { paymentMethodId: method.id },
          data: {
            ownershipVerifiedAt: decision === "verify" ? new Date() : null,
          },
        });
      }
      if (method.wallet) {
        await tx.wallet.update({
          where: { paymentMethodId: method.id },
          data: {
            ownershipVerifiedAt: decision === "verify" ? new Date() : null,
          },
        });
      }
      if (decision === "reject" && method.primaryForProfile) {
        await tx.receiveProfile.update({
          where: { id: method.primaryForProfile.id },
          data: { available: false },
        });
        await tx.customerProfile.update({
          where: { id: method.customerId },
          data: { publicReceiveEnabled: false },
        });
      }
      await auditWith(tx, {
        action:
          decision === "verify"
            ? "customer.payment_method_verified"
            : "customer.payment_method_rejected",
        entityType: "PaymentMethod",
        entityId: method.id,
        actorId: admin.id,
        actorLabel: "Operator",
        meta: {
          from: method.status,
          to: status,
          reason,
          providerReference: providerReference || null,
          customerId: method.customerId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  done(`Payment method ${decision === "verify" ? "verified" : "rejected"}.`);
}
