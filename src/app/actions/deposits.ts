"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { isValidDepositAmount, normalizeDepositTxHash } from "@/lib/deposit-policy";
import { db } from "@/lib/db";
import { createCryptoInvoice } from "@/lib/nowpayments";
import { notify } from "@/lib/notify";
import { createReference } from "@/lib/secure-token";
import { SITE_URL } from "@/lib/site";

const DEPOSIT_PATH = "/partner/deposit";
const ADMIN_PATH = "/admin/deposits";

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function finish(path: string, kind: "notice" | "error", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function decimalAmount(raw: string): Prisma.Decimal | null {
  return isValidDepositAmount(raw) ? new Prisma.Decimal(raw) : null;
}

/** Create a hosted USDT-TRC20 reserve invoice owned by the signed-in partner. */
export async function createPartnerDeposit(fd: FormData) {
  const user = await requireRole("PARTNER");
  if (!user.partner) redirect("/login");
  if (["REJECTED", "SUSPENDED"].includes(user.partner.status)) {
    finish(DEPOSIT_PATH, "error", "Deposits are unavailable while this partner account is restricted.");
  }

  const amount = decimalAmount(text(fd, "amount"));
  if (!amount) finish(DEPOSIT_PATH, "error", "Enter a USDT amount from 10 to 1,000,000 with up to 6 decimals.");

  await db.partnerDeposit.updateMany({
    where: { partnerId: user.partner.id, status: "AWAITING_PAYMENT", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED", providerStatus: "expired_locally" },
  });
  const openInvoices = await db.partnerDeposit.count({
    where: { partnerId: user.partner.id, status: { in: ["AWAITING_PAYMENT", "CONFIRMING"] } },
  });
  if (openInvoices >= 3) {
    finish(DEPOSIT_PATH, "error", "You already have three active deposit invoices. Complete or wait for one to expire.");
  }

  const deposit = await db.partnerDeposit.create({
    data: {
      reference: createReference("DEP"),
      partnerId: user.partner.id,
      amount,
      submittedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const invoice = await createCryptoInvoice({
    amountUsdt: Number(amount),
    description: `INRP2P partner operating reserve · ${user.partner.reference} · ${deposit.reference}`,
    orderId: `deposit:${deposit.id}`,
    successUrl: `${SITE_URL}${DEPOSIT_PATH}?notice=${encodeURIComponent("Payment submitted. Confirmation can take several minutes.")}`,
  });

  if (!invoice) {
    await db.partnerDeposit.delete({ where: { id: deposit.id } });
    finish(DEPOSIT_PATH, "error", "The USDT payment gateway is not ready. Contact operations before sending any funds.");
  }

  await db.partnerDeposit.update({
    where: { id: deposit.id },
    data: { providerInvoiceId: invoice.id, providerInvoiceUrl: invoice.invoiceUrl, providerStatus: "waiting" },
  });
  await audit({
    action: "deposit.invoice_created",
    entityType: "PartnerDeposit",
    entityId: deposit.id,
    actorId: user.id,
    actorLabel: user.partner.displayName,
    partnerId: user.partner.id,
    meta: { reference: deposit.reference, amount: amount.toString(), network: "TRC20", provider: "NOWPAYMENTS" },
  });
  finish(DEPOSIT_PATH, "notice", "Deposit invoice created. Pay it only through the secure checkout shown below.");
}

/** Audited operator override for exceptional cases and full reserve refunds. */
export async function reviewPartnerDeposit(fd: FormData) {
  const admin = await requireRole("ADMIN");
  const depositId = text(fd, "depositId");
  const decision = text(fd, "decision");
  const note = text(fd, "note");
  const deposit = await db.partnerDeposit.findUnique({
    where: { id: depositId },
    include: { partner: true },
  });
  if (!deposit) finish(ADMIN_PATH, "error", "Deposit not found.");

  const now = new Date();
  let nextStatus = deposit.status;
  let transactionHash: string | undefined;
  let refundTransactionHash: string | undefined;
  let actualAmount: Prisma.Decimal | undefined;

  if (decision === "confirm") {
    if (deposit.status === "CONFIRMED" || deposit.status === "REFUNDED") {
      finish(ADMIN_PATH, "error", "This deposit is already final.");
    }
    transactionHash = normalizeDepositTxHash(text(fd, "transactionHash")) ?? undefined;
    if (!transactionHash) finish(ADMIN_PATH, "error", "A valid 64-character on-chain transaction hash is required for manual confirmation.");
    const duplicate = await db.partnerDeposit.findFirst({ where: { id: { not: deposit.id }, OR: [{ transactionHash }, { refundTransactionHash: transactionHash }] }, select: { id: true } });
    if (duplicate) finish(ADMIN_PATH, "error", "This transaction hash is already assigned to another deposit.");
    actualAmount = decimalAmount(text(fd, "actualAmount")) ?? undefined;
    if (!actualAmount) finish(ADMIN_PATH, "error", "Enter the amount actually received before confirming.");
    if (!note) finish(ADMIN_PATH, "error", "Explain the evidence used for this manual confirmation.");
    nextStatus = "CONFIRMED";
  } else if (decision === "reject") {
    if (!["AWAITING_PAYMENT", "CONFIRMING", "EXPIRED"].includes(deposit.status)) finish(ADMIN_PATH, "error", "Only a non-final deposit can be rejected.");
    if (!note) finish(ADMIN_PATH, "error", "A rejection reason is required.");
    nextStatus = "REJECTED";
  } else if (decision === "refund") {
    if (deposit.status !== "CONFIRMED") finish(ADMIN_PATH, "error", "Only a confirmed deposit can be marked refunded.");
    refundTransactionHash = normalizeDepositTxHash(text(fd, "refundTransactionHash")) ?? undefined;
    if (!refundTransactionHash) finish(ADMIN_PATH, "error", "A valid refund transaction hash is required.");
    const duplicate = await db.partnerDeposit.findFirst({ where: { id: { not: deposit.id }, OR: [{ transactionHash: refundTransactionHash }, { refundTransactionHash }] }, select: { id: true } });
    if (duplicate) finish(ADMIN_PATH, "error", "This refund transaction hash is already recorded.");
    if (!note) finish(ADMIN_PATH, "error", "A refund note is required.");
    nextStatus = "REFUNDED";
  } else {
    finish(ADMIN_PATH, "error", "Invalid deposit decision.");
  }

  await db.partnerDeposit.update({
    where: { id: deposit.id },
    data: {
      status: nextStatus,
      actualAmount,
      transactionHash,
      refundTransactionHash,
      providerStatus: decision === "confirm" ? "manual_confirmed" : deposit.providerStatus,
      reviewedById: admin.id,
      reviewNote: note,
      confirmedAt: decision === "confirm" ? now : deposit.confirmedAt,
      refundedAt: decision === "refund" ? now : deposit.refundedAt,
    },
  });
  await audit({
    action: `deposit.${decision === "confirm" ? "manually_confirmed" : decision === "refund" ? "refunded" : "rejected"}`,
    entityType: "PartnerDeposit",
    entityId: deposit.id,
    actorId: admin.id,
    actorLabel: "Operator",
    partnerId: deposit.partnerId,
    meta: { from: deposit.status, to: nextStatus, note, transactionHash, refundTransactionHash },
  });
  await notify(deposit.partner.userId, {
    title: nextStatus === "CONFIRMED" ? "USDT reserve confirmed" : nextStatus === "REFUNDED" ? "USDT reserve refunded" : "Deposit rejected",
    body: nextStatus === "CONFIRMED" ? `${(actualAmount ?? deposit.amount).toString()} USDT has been credited to your reserve.` : nextStatus === "REFUNDED" ? `${(deposit.actualAmount ?? deposit.amount).toString()} USDT has been marked refunded.` : `Deposit ${deposit.reference} was rejected. Open the deposit page for details.`,
    telegramHtml: nextStatus === "CONFIRMED" ? `✅ <b>USDT reserve confirmed</b>\n${(actualAmount ?? deposit.amount).toString()} USDT credited.` : nextStatus === "REFUNDED" ? `↩️ <b>USDT reserve refunded</b>\nDeposit ${deposit.reference}.` : `❌ <b>Deposit rejected</b>\n${deposit.reference}`,
    link: DEPOSIT_PATH,
  });
  revalidatePath(DEPOSIT_PATH);
  revalidatePath(`/admin/partners/${deposit.partnerId}`);
  finish(ADMIN_PATH, "notice", `Deposit ${deposit.reference} updated to ${nextStatus.toLowerCase().replaceAll("_", " ")}.`);
}
