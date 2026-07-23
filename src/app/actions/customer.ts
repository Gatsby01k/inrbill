"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { actorLabel, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReference } from "@/lib/secure-token";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function back(formData: FormData) {
  const target = value(formData, "back");
  return /^\/(?:move\/c[a-z0-9]{20,40}|account)$/i.test(target) ? target : "/account";
}

export async function startCustomerVerification(formData: FormData) {
  const user = await requireRole("CUSTOMER");
  if (!user.customer) redirect("/");
  const path = back(formData);
  const existing = await db.verificationCase.findFirst({
    where: {
      customerId: user.customer.id,
      status: { in: ["IN_PROGRESS", "NEEDS_REVIEW", "APPROVED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) redirect(`${path}?notice=${encodeURIComponent("Verification is already active.")}`);

  const created = await db.$transaction(async (tx) => {
    const item = await tx.verificationCase.create({
      data: {
        reference: createReference("VER"),
        customerId: user.customer!.id,
        checks: {
          create: ["IDENTITY", "SANCTIONS_PEP", "PAYMENT_METHOD", "SOURCE_OF_FUNDS"].map(
            (type) => ({ type }),
          ),
        },
      },
    });
    await tx.customerProfile.update({
      where: { id: user.customer!.id },
      data: { complianceStatus: "PENDING" },
    });
    return item;
  });
  await audit({
    action: "customer.verification_started",
    entityType: "VerificationCase",
    entityId: created.id,
    actorId: user.id,
    actorLabel: actorLabel(user),
    meta: { customerId: user.customer.id },
  });
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent("Verification started. Add the requested evidence.")}`);
}
