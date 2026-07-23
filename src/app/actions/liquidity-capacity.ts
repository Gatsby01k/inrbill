"use server";

import { Prisma, type PaymentRail, type WalletNetwork } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  encryptFinancialJson,
  FinancialDataConfigurationError,
  maskAccount,
  maskUpi,
  maskWallet,
} from "@/lib/financial-crypto";
import {
  normalizeAccountNumber,
  normalizeIfsc,
  normalizeUpiHandle,
  normalizeWalletAddress,
} from "@/lib/payment-validation";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function values(formData: FormData, key: string) {
  return formData.getAll(key).filter((item): item is string => typeof item === "string");
}

function fail(message: string): never {
  redirect(`/admin/liquidity?error=${encodeURIComponent(message)}`);
}

function decimal(raw: string, scale: number) {
  try {
    const amount = new Prisma.Decimal(raw).toDecimalPlaces(scale);
    return amount.isFinite() && amount.gte(0) ? amount : null;
  } catch {
    return null;
  }
}

function collectionDetails(formData: FormData, direction: string) {
  const rail = value(formData, "collectionRail");
  const beneficiary = value(formData, "beneficiary").slice(0, 120);
  if (direction === "INR_TO_USDT" && rail === "UPI") {
    const upiId = normalizeUpiHandle(value(formData, "upiId"));
    if (!upiId || beneficiary.length < 2) fail("Enter a valid beneficiary and UPI ID.");
    return {
      rail: "UPI" as const,
      encrypted: encryptFinancialJson({ rail: "UPI", beneficiary, upiId }),
      masked: `${beneficiary} · ${maskUpi(upiId)}`,
    };
  }
  if (direction === "INR_TO_USDT" && ["IMPS", "BANK_TRANSFER"].includes(rail)) {
    const accountNumber = normalizeAccountNumber(value(formData, "accountNumber"));
    const ifsc = normalizeIfsc(value(formData, "ifsc"));
    const bankName = value(formData, "bankName").slice(0, 80);
    if (!accountNumber || !ifsc || beneficiary.length < 2 || bankName.length < 2) {
      fail("Enter valid beneficiary bank instructions.");
    }
    return {
      rail: rail as "IMPS" | "BANK_TRANSFER",
      encrypted: encryptFinancialJson({
        rail,
        beneficiary,
        bankName,
        accountNumber,
        ifsc,
      }),
      masked: `${beneficiary} · ${maskAccount(bankName, accountNumber)}`,
    };
  }
  if (direction === "USDT_TO_INR" && rail === "BLOCKCHAIN") {
    const networkRaw = value(formData, "collectionNetwork");
    const network: WalletNetwork | null =
      networkRaw === "TRC20" || networkRaw === "ERC20" || networkRaw === "POLYGON"
        ? networkRaw
        : null;
    const address = network
      ? normalizeWalletAddress(value(formData, "collectionAddress"), network)
      : null;
    if (!network || !address) fail("Enter a valid collection wallet and network.");
    return {
      rail: "BLOCKCHAIN" as const,
      network,
      encrypted: encryptFinancialJson({ rail: "BLOCKCHAIN", network, address }),
      masked: maskWallet(network, address),
    };
  }
  fail("Collection instructions do not match the corridor.");
}

export async function createLiquidityCapacity(formData: FormData) {
  const admin = await requireAdminPermission("ORDER_OPERATIONS");
  const partnerId = value(formData, "partnerId");
  const directionRaw = value(formData, "direction");
  if (directionRaw !== "INR_TO_USDT" && directionRaw !== "USDT_TO_INR") {
    fail("Select a supported direction.");
  }
  const declaredInr = decimal(value(formData, "declaredInr"), 2);
  const declaredUsdt = decimal(value(formData, "declaredUsdt"), 6);
  if (!declaredInr?.gt(0) || !declaredUsdt?.gt(0)) {
    fail("Declared INR and USDT capacity must both be positive.");
  }
  const minInr = value(formData, "minInr") ? decimal(value(formData, "minInr"), 2) : null;
  const maxInr = value(formData, "maxInr") ? decimal(value(formData, "maxInr"), 2) : null;
  const minUsdt = value(formData, "minUsdt") ? decimal(value(formData, "minUsdt"), 6) : null;
  const maxUsdt = value(formData, "maxUsdt") ? decimal(value(formData, "maxUsdt"), 6) : null;
  if ([minInr, maxInr, minUsdt, maxUsdt].some((amount) => amount?.lt(0))) {
    fail("Ticket limits cannot be negative.");
  }

  const hours = Math.min(24, Math.max(1, Number(value(formData, "hours")) || 8));
  const rails = values(formData, "rails").filter((rail): rail is PaymentRail =>
    ["UPI", "IMPS", "BANK_TRANSFER", "BLOCKCHAIN"].includes(rail),
  );
  const networks = values(formData, "networks").filter((network): network is WalletNetwork =>
    ["TRC20", "ERC20", "POLYGON"].includes(network),
  );
  if (!rails.length || !networks.length) fail("Select supported rails and USDT networks.");

  const partner = await db.partnerProfile.findFirst({
    where: {
      id: partnerId,
      status: "VERIFIED",
      verificationCases: {
        some: { status: "APPROVED", expiresAt: { gt: new Date() } },
      },
    },
  });
  if (!partner) fail("Capacity requires a verified partner with unexpired review.");

  try {
    const collection = collectionDetails(formData, directionRaw);
    if (!rails.includes(collection.rail)) {
      fail("The collection rail must be included in supported rails.");
    }
    if ("network" in collection && collection.network && !networks.includes(collection.network)) {
      fail("The collection network must be included in supported networks.");
    }
    const capacity = await db.liquidityCapacity.create({
      data: {
        partnerId,
        direction: directionRaw,
        declaredInr,
        availableInr: declaredInr,
        declaredUsdt,
        availableUsdt: declaredUsdt,
        minInr,
        maxInr,
        minUsdt,
        maxUsdt,
        rails,
        networks,
        banks: values(formData, "banks").map((bank) => bank.slice(0, 80)),
        collectionDetailsEncrypted: collection.encrypted,
        collectionDetailsMasked: collection.masked,
        workingHours: value(formData, "workingHours")
          ? { label: value(formData, "workingHours").slice(0, 120) }
          : undefined,
        lastConfirmedAt: new Date(),
        availableUntil: new Date(Date.now() + hours * 60 * 60_000),
      },
    });
    await audit({
      action: "liquidity.capacity_created",
      entityType: "LiquidityCapacity",
      entityId: capacity.id,
      actorId: admin.id,
      actorLabel: "Operator",
      partnerId,
      meta: {
        direction: directionRaw,
        declaredInr: declaredInr.toString(),
        declaredUsdt: declaredUsdt.toString(),
        expiresInHours: hours,
      },
    });
  } catch (error) {
    if (error instanceof FinancialDataConfigurationError) {
      fail("Encrypted financial-data storage is not configured.");
    }
    throw error;
  }
  revalidatePath("/admin/liquidity");
  redirect("/admin/liquidity?notice=Capacity%20created");
}

export async function pauseLiquidityCapacity(formData: FormData) {
  const admin = await requireAdminPermission("ORDER_OPERATIONS");
  const capacityId = value(formData, "capacityId");
  const capacity = await db.liquidityCapacity.findUnique({ where: { id: capacityId } });
  if (!capacity) fail("Capacity not found.");
  if (
    capacity.reservedInr.gt(0) ||
    capacity.reservedUsdt.gt(0) ||
    capacity.pendingInr.gt(0) ||
    capacity.pendingUsdt.gt(0)
  ) {
    fail("Capacity with reserved or pending exposure cannot be taken offline.");
  }
  await db.liquidityCapacity.update({
    where: { id: capacity.id },
    data: { status: "PAUSED", version: { increment: 1 } },
  });
  await audit({
    action: "liquidity.capacity_paused",
    entityType: "LiquidityCapacity",
    entityId: capacity.id,
    actorId: admin.id,
    actorLabel: "Operator",
    partnerId: capacity.partnerId,
  });
  revalidatePath("/admin/liquidity");
  redirect("/admin/liquidity?notice=Capacity%20paused");
}
