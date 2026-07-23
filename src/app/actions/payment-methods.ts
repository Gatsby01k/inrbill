"use server";

import { Prisma, type PaymentMethodPurpose, type WalletNetwork } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  encryptSensitive,
  financialFingerprint,
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
import { runProviderCheck } from "@/lib/verification-providers";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function returnPath(formData: FormData) {
  const requested = value(formData, "back");
  return /^\/(?:move\/c[a-z0-9]{20,40}|account|receive)$/i.test(requested)
    ? requested
    : "/account";
}

function fail(formData: FormData, message: string): never {
  const path = returnPath(formData);
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(formData: FormData, message: string): never {
  const path = returnPath(formData);
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(message)}`);
}

async function customer() {
  const user = await requireRole("CUSTOMER");
  if (!user.customer) redirect("/");
  return { user, customer: user.customer };
}

function purpose(raw: string): PaymentMethodPurpose {
  return raw === "SEND" || raw === "RECEIVE" ? raw : "BOTH";
}

function duplicateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function addBankAccount(formData: FormData) {
  const { customer: profile } = await customer();
  const holder = value(formData, "accountHolder");
  const accountNumber = normalizeAccountNumber(value(formData, "accountNumber"));
  const ifsc = normalizeIfsc(value(formData, "ifsc"));
  const bankName = value(formData, "bankName").slice(0, 80);
  const label = value(formData, "label").slice(0, 60) || bankName;
  if (holder.length < 2 || holder.length > 120 || !accountNumber || !ifsc || bankName.length < 2) {
    fail(formData, "Enter a valid account holder, account number, IFSC and bank name.");
  }

  try {
    const provider = await runProviderCheck("BANK", "CUSTOMER_BANK_ACCOUNT", profile.id, {
      accountHolder: holder,
      accountNumber,
      ifsc,
    });
    const verified = provider.status === "PASSED";
    await db.$transaction(
      async (tx) => {
        const method = await tx.paymentMethod.create({
          data: {
            customerId: profile.id,
            type: "BANK_ACCOUNT",
            purpose: purpose(value(formData, "purpose")),
            status: verified ? "OWNERSHIP_VERIFIED" : "UNVERIFIED",
            label,
            maskedLabel: maskAccount(bankName, accountNumber),
          },
        });
        await tx.bankAccount.create({
          data: {
            paymentMethodId: method.id,
            accountHolderEncrypted: encryptSensitive(holder),
            accountNumberEncrypted: encryptSensitive(accountNumber),
            accountNumberHash: financialFingerprint(accountNumber),
            accountLast4: accountNumber.slice(-4),
            ifscEncrypted: encryptSensitive(ifsc),
            ifscMasked: `${ifsc.slice(0, 4)}••${ifsc.slice(-3)}`,
            bankName,
            ownershipVerifiedAt: verified ? new Date() : null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof FinancialDataConfigurationError) {
      fail(formData, "Secure payment-method storage is not configured.");
    }
    if (duplicateError(error)) fail(formData, "This bank account is already saved.");
    fail(formData, "The bank account could not be saved.");
  }
  done(formData, "Bank account saved.");
}

export async function addUpiHandle(formData: FormData) {
  const { customer: profile } = await customer();
  const handle = normalizeUpiHandle(value(formData, "upiId"));
  const label = value(formData, "label").slice(0, 60) || "UPI";
  if (!handle) fail(formData, "Enter a valid UPI ID.");

  try {
    const provider = await runProviderCheck("BANK", "CUSTOMER_UPI_HANDLE", profile.id, {
      upiId: handle,
    });
    const verified = provider.status === "PASSED";
    await db.$transaction(
      async (tx) => {
        const method = await tx.paymentMethod.create({
          data: {
            customerId: profile.id,
            type: "UPI_HANDLE",
            purpose: purpose(value(formData, "purpose")),
            status: verified ? "OWNERSHIP_VERIFIED" : "UNVERIFIED",
            label,
            maskedLabel: maskUpi(handle),
          },
        });
        await tx.uPIHandle.create({
          data: {
            paymentMethodId: method.id,
            handleEncrypted: encryptSensitive(handle),
            handleHash: financialFingerprint(handle),
            handleMasked: maskUpi(handle),
            ownershipVerifiedAt: verified ? new Date() : null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof FinancialDataConfigurationError) {
      fail(formData, "Secure payment-method storage is not configured.");
    }
    if (duplicateError(error)) fail(formData, "This UPI ID is already saved.");
    fail(formData, "The UPI ID could not be saved.");
  }
  done(formData, "UPI ID saved.");
}

export async function addWallet(formData: FormData) {
  const { customer: profile } = await customer();
  const networkRaw = value(formData, "network");
  const network: WalletNetwork | null =
    networkRaw === "TRC20" || networkRaw === "ERC20" || networkRaw === "POLYGON"
      ? networkRaw
      : null;
  const address = network
    ? normalizeWalletAddress(value(formData, "address"), network)
    : null;
  const label = value(formData, "label").slice(0, 60) || `${network ?? "USDT"} wallet`;
  if (!network || !address) fail(formData, "The wallet address does not match the selected network.");

  try {
    await db.$transaction(
      async (tx) => {
        const method = await tx.paymentMethod.create({
          data: {
            customerId: profile.id,
            type: "USDT_WALLET",
            purpose: purpose(value(formData, "purpose")),
            status: "FORMAT_VALIDATED",
            label,
            maskedLabel: maskWallet(network, address),
          },
        });
        await tx.wallet.create({
          data: {
            paymentMethodId: method.id,
            network,
            addressEncrypted: encryptSensitive(address),
            addressHash: financialFingerprint(`${network}:${address}`),
            addressLast4: address.slice(-4),
            formatValidatedAt: new Date(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof FinancialDataConfigurationError) {
      fail(formData, "Secure payment-method storage is not configured.");
    }
    if (duplicateError(error)) fail(formData, "This wallet is already saved.");
    fail(formData, "The wallet could not be saved.");
  }
  done(formData, "Wallet saved. Address format is validated; ownership is not yet verified.");
}

export async function disablePaymentMethod(formData: FormData) {
  const { customer: profile } = await customer();
  const methodId = value(formData, "methodId");
  const inActiveOrder = await db.order.count({
    where: {
      customerId: profile.id,
      status: { notIn: ["COMPLETED", "CANCELLED", "EXPIRED", "FAILED"] },
      OR: [{ sourcePaymentMethodId: methodId }, { destinationPaymentMethodId: methodId }],
    },
  });
  if (inActiveOrder) fail(formData, "This method is attached to an active move.");
  const updated = await db.paymentMethod.updateMany({
    where: { id: methodId, customerId: profile.id },
    data: { status: "DISABLED", isDefaultReceive: false, isDefaultSend: false },
  });
  if (!updated.count) fail(formData, "Payment method not found.");
  done(formData, "Payment method disabled.");
}
