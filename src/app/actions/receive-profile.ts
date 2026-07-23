"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { actorLabel, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { serverActionIdentity } from "@/lib/request-security";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/secure-token";

const RESERVED_IDS = new Set([
  "admin",
  "api",
  "account",
  "help",
  "move",
  "orders",
  "pay",
  "receive",
  "security",
  "support",
  "www",
]);

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function fail(message: string): never {
  redirect(`/receive?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  revalidatePath("/receive");
  redirect(`/receive?notice=${encodeURIComponent(message)}`);
}

async function customer() {
  const user = await requireRole("CUSTOMER");
  if (!user.customer) redirect("/");
  return { user, profile: user.customer };
}

function normalizeIdentity(raw: string) {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/@inrp2p$/i, "");
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(normalized) &&
    !RESERVED_IDS.has(normalized)
    ? normalized
    : null;
}

export async function updateInrp2pIdentity(formData: FormData) {
  const { user, profile } = await customer();
  const identity = normalizeIdentity(value(formData, "identity"));
  if (!identity) {
    fail("Use 3–30 letters, numbers, dots, underscores, or hyphens.");
  }
  const identityKey = await serverActionIdentity();
  if (!(await consumeRateLimit("identity-update", `${user.id}:${identityKey}`, 8, 24 * 60 * 60_000))) {
    fail("Too many identity changes. Try again tomorrow.");
  }
  const enablePublic = value(formData, "public") === "on";
  const [receiveProfile, activeVerification] = await Promise.all([
    db.receiveProfile.findUnique({
      where: { customerId: profile.id },
      include: { primaryMethod: true },
    }),
    db.verificationCase.findFirst({
      where: {
        customerId: profile.id,
        status: "APPROVED",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);
  if (
    enablePublic &&
    (profile.complianceStatus !== "VERIFIED" ||
      !activeVerification ||
      !receiveProfile?.available ||
      !receiveProfile.primaryMethod ||
      ["DISABLED", "REJECTED", "UNVERIFIED"].includes(receiveProfile.primaryMethod.status))
  ) {
    fail(
      "Current compliance approval and an available, validated receive method are required before enabling the public page.",
    );
  }

  try {
    await db.customerProfile.update({
      where: { id: profile.id },
      data: {
        inrp2pId: identity,
        publicReceiveEnabled: enablePublic,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      fail("That INRP2P ID is unavailable.");
    }
    throw error;
  }
  await audit({
    action: "customer.identity_updated",
    entityType: "CustomerProfile",
    entityId: profile.id,
    actorId: user.id,
    actorLabel: actorLabel(user),
    meta: { identity, publicReceiveEnabled: enablePublic },
  });
  done("INRP2P ID updated.");
}

export async function updateReceiveProfile(formData: FormData) {
  const { user, profile } = await customer();
  const primaryMethodId = value(formData, "primaryMethodId");
  const fallbackIds = [
    value(formData, "fallback1"),
    value(formData, "fallback2"),
    value(formData, "fallback3"),
  ].filter(Boolean);
  const methodIds = [primaryMethodId, ...fallbackIds];
  if (!primaryMethodId || new Set(methodIds).size !== methodIds.length) {
    fail("Choose one primary method and distinct fallbacks.");
  }
  const methods = await db.paymentMethod.findMany({
    where: {
      id: { in: methodIds },
      customerId: profile.id,
      purpose: { in: ["RECEIVE", "BOTH"] },
      status: { notIn: ["DISABLED", "REJECTED"] },
    },
  });
  if (methods.length !== methodIds.length) {
    fail("A selected receive method is unavailable.");
  }
  const primary = methods.find((method) => method.id === primaryMethodId)!;
  const available = value(formData, "available") === "on";
  if (available && primary.status === "UNVERIFIED") {
    fail("The primary receive method must be validated before it can be available.");
  }

  await db.$transaction(
    async (tx) => {
      const receiveProfile = await tx.receiveProfile.upsert({
        where: { customerId: profile.id },
        update: { primaryMethodId, available },
        create: { customerId: profile.id, primaryMethodId, available },
      });
      await tx.receiveProfileFallback.deleteMany({
        where: { receiveProfileId: receiveProfile.id },
      });
      if (fallbackIds.length) {
        await tx.receiveProfileFallback.createMany({
          data: fallbackIds.map((paymentMethodId, index) => ({
            receiveProfileId: receiveProfile.id,
            paymentMethodId,
            position: index + 1,
          })),
        });
      }
      if (!available) {
        await tx.customerProfile.update({
          where: { id: profile.id },
          data: { publicReceiveEnabled: false },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await audit({
    action: "customer.receive_profile_updated",
    entityType: "CustomerProfile",
    entityId: profile.id,
    actorId: user.id,
    actorLabel: actorLabel(user),
    meta: {
      primaryMethodId,
      fallbackCount: fallbackIds.length,
      available,
    },
  });
  done("Receive Profile updated. No fallback is used without new terms and acceptance.");
}

export async function createReceiveLink(formData: FormData) {
  const { user, profile } = await customer();
  const [receiveProfile, activeVerification] = await Promise.all([
    db.receiveProfile.findUnique({
      where: { customerId: profile.id },
      include: { primaryMethod: true },
    }),
    db.verificationCase.findFirst({
      where: {
        customerId: profile.id,
        status: "APPROVED",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);
  if (
    profile.complianceStatus !== "VERIFIED" ||
    !activeVerification ||
    !receiveProfile?.available ||
    !receiveProfile.primaryMethod ||
    ["UNVERIFIED", "REJECTED", "DISABLED"].includes(receiveProfile.primaryMethod.status)
  ) {
    fail("An available verified Receive Profile is required before creating a link.");
  }
  const amountRaw = value(formData, "amount");
  let amount: Prisma.Decimal | null = null;
  if (amountRaw) {
    try {
      amount = new Prisma.Decimal(amountRaw);
    } catch {
      fail("Enter a valid requested amount.");
    }
    if (!amount.isFinite() || amount.lte(0) || amount.gt(100_000_000)) {
      fail("Enter a positive requested amount within the supported range.");
    }
    amount = amount.toDecimalPlaces(
      receiveProfile.primaryMethod.type === "USDT_WALLET" ? 6 : 2,
      Prisma.Decimal.ROUND_HALF_UP,
    );
  }
  const hours = Math.min(168, Math.max(1, Number(value(formData, "hours")) || 24));
  const maxUses = Math.min(100, Math.max(1, Number(value(formData, "maxUses")) || 1));
  const memo = value(formData, "memo").slice(0, 140) || null;
  const token = createOpaqueToken();
  const link = await db.receiveLink.create({
    data: {
      customerId: profile.id,
      tokenHash: hashOpaqueToken(token),
      amount,
      currency:
        amount !== null
          ? receiveProfile.primaryMethod.type === "USDT_WALLET"
            ? "USDT"
            : "INR"
          : null,
      memo,
      expiresAt: new Date(Date.now() + hours * 60 * 60_000),
      maxUses,
    },
  });
  await audit({
    action: "customer.receive_link_created",
    entityType: "ReceiveLink",
    entityId: link.id,
    actorId: user.id,
    actorLabel: actorLabel(user),
    meta: {
      amount: amount?.toString() ?? null,
      currency: link.currency,
      maxUses,
      expiresAt: link.expiresAt,
    },
  });
  revalidatePath("/receive");
  redirect(
    `/receive?notice=${encodeURIComponent("Payment-request link created. Copy it now.")}&created=${encodeURIComponent(token)}`,
  );
}

export async function revokeReceiveLink(formData: FormData) {
  const { user, profile } = await customer();
  const linkId = value(formData, "linkId");
  const updated = await db.receiveLink.updateMany({
    where: { id: linkId, customerId: profile.id, active: true },
    data: { active: false },
  });
  if (!updated.count) fail("Payment-request link not found or already inactive.");
  await audit({
    action: "customer.receive_link_revoked",
    entityType: "ReceiveLink",
    entityId: linkId,
    actorId: user.id,
    actorLabel: actorLabel(user),
  });
  done("Payment-request link revoked.");
}
