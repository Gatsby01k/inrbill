import "server-only";

import type { Currency, PaymentRail } from "@prisma/client";
import { decryptFinancialJson } from "@/lib/financial-crypto";

type InstructionInput = {
  reference: string;
  rail: PaymentRail;
  amount: { toString(): string };
  currency: Currency;
  instructionsEncrypted: string;
  expiresAt: Date | null;
};

export type CustomerPaymentInstruction =
  | {
      kind: "UPI";
      amount: string;
      currency: "INR";
      beneficiary: string;
      upiId: string;
      orderReference: string;
      paymentUri: string;
      qrValue: string;
      copyText: string;
      expiresAt: string | null;
    }
  | {
      kind: "BANK";
      rail: "IMPS" | "BANK_TRANSFER";
      amount: string;
      currency: "INR";
      beneficiary: string;
      bankName: string;
      accountNumber: string;
      ifsc: string;
      orderReference: string;
      qrValue: null;
      copyText: string;
      expiresAt: string | null;
    }
  | {
      kind: "BLOCKCHAIN";
      amount: string;
      currency: "USDT";
      network: "TRC20" | "ERC20" | "POLYGON";
      address: string;
      orderReference: string;
      qrValue: string;
      copyText: string;
      expiresAt: string | null;
    };

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 180) {
    throw new Error(`Payment instruction ${label} is invalid.`);
  }
  return value.trim();
}

/**
 * Decrypt only after the caller has proved order ownership. The return value
 * contains exactly the fields a customer needs to make the payment.
 */
export function customerPaymentInstruction(
  input: InstructionInput,
): CustomerPaymentInstruction {
  const raw = decryptFinancialJson<Record<string, unknown>>(input.instructionsEncrypted);
  const amount = input.amount.toString();
  const expiresAt = input.expiresAt?.toISOString() ?? null;

  if (input.rail === "UPI" && input.currency === "INR") {
    const beneficiary = requiredString(raw.beneficiary, "beneficiary");
    const upiId = requiredString(raw.upiId, "UPI ID").toLowerCase();
    const params = new URLSearchParams({
      pa: upiId,
      pn: beneficiary,
      am: amount,
      cu: "INR",
      tn: `INRP2P ${input.reference}`,
    });
    const paymentUri = `upi://pay?${params.toString()}`;
    return {
      kind: "UPI",
      amount,
      currency: "INR",
      beneficiary,
      upiId,
      orderReference: input.reference,
      paymentUri,
      qrValue: paymentUri,
      copyText: [
        `Pay exactly: ₹${amount}`,
        `Beneficiary: ${beneficiary}`,
        `UPI ID: ${upiId}`,
        `Reference: ${input.reference}`,
      ].join("\n"),
      expiresAt,
    };
  }

  if (
    (input.rail === "IMPS" || input.rail === "BANK_TRANSFER") &&
    input.currency === "INR"
  ) {
    const beneficiary = requiredString(raw.beneficiary, "beneficiary");
    const bankName = requiredString(raw.bankName, "bank name");
    const accountNumber = requiredString(raw.accountNumber, "account number");
    const ifsc = requiredString(raw.ifsc, "IFSC").toUpperCase();
    return {
      kind: "BANK",
      rail: input.rail,
      amount,
      currency: "INR",
      beneficiary,
      bankName,
      accountNumber,
      ifsc,
      orderReference: input.reference,
      qrValue: null,
      copyText: [
        `Pay exactly: ₹${amount}`,
        `Beneficiary: ${beneficiary}`,
        `Bank: ${bankName}`,
        `Account: ${accountNumber}`,
        `IFSC: ${ifsc}`,
        `Reference: ${input.reference}`,
      ].join("\n"),
      expiresAt,
    };
  }

  if (input.rail === "BLOCKCHAIN" && input.currency === "USDT") {
    const network = requiredString(raw.network, "network");
    if (network !== "TRC20" && network !== "ERC20" && network !== "POLYGON") {
      throw new Error("Payment instruction network is invalid.");
    }
    const address = requiredString(raw.address, "wallet address");
    return {
      kind: "BLOCKCHAIN",
      amount,
      currency: "USDT",
      network,
      address,
      orderReference: input.reference,
      qrValue: address,
      copyText: [
        `Send exactly: ${amount} USDT`,
        `Network: ${network}`,
        `Address: ${address}`,
        `Reference: ${input.reference}`,
      ].join("\n"),
      expiresAt,
    };
  }

  throw new Error("Payment instructions do not match this order.");
}
