"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { createSession, generateAccessPassword, getSession, hashPassword } from "@/lib/auth";
import {
  CUSTOMER_OTP_MAX_ATTEMPTS,
  customerOtpMatches,
  issueCustomerOtp,
} from "@/lib/customer-otp";
import { db } from "@/lib/db";
import { pendingQuoteClaim } from "@/lib/pending-quote";
import { consumeRateLimit } from "@/lib/rate-limit";
import { serverActionIdentity } from "@/lib/request-security";
import { emailSchema, type ActionState } from "@/lib/schemas";
import { hashOpaqueToken } from "@/lib/secure-token";

export type CustomerOtpState = ActionState & {
  challengeToken?: string;
  email?: string;
  devCode?: string;
};

function safeQuoteId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^c[a-z0-9]{20,40}$/i.test(value) ? value : null;
}

export async function requestCustomerOtp(
  _previous: CustomerOtpState,
  formData: FormData,
): Promise<CustomerOtpState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const identity = await serverActionIdentity();
  const permitted = await Promise.all([
    consumeRateLimit("customer-otp-ip", identity, 8, 60 * 60_000),
    consumeRateLimit("customer-otp-email", parsed.data, 4, 60 * 60_000),
  ]);
  if (permitted.some((allowed) => !allowed)) {
    return { error: "Too many code requests. Try again later." };
  }

  const quoteId = safeQuoteId(formData.get("quote"));
  if (quoteId && !(await pendingQuoteClaim(quoteId))) {
    return { error: "That quote is no longer available. Return and request a fresh quote." };
  }
  const issued = await issueCustomerOtp(parsed.data, quoteId ?? undefined);
  if (!issued) {
    return { error: "Secure email delivery is unavailable. Try again shortly." };
  }
  return {
    ok: true,
    challengeToken: issued.token,
    email: parsed.data,
    devCode: issued.devCode ?? undefined,
  };
}

export async function verifyCustomerOtp(
  _previous: CustomerOtpState,
  formData: FormData,
): Promise<CustomerOtpState> {
  const token = String(formData.get("challengeToken") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (token.length < 20 || !/^\d{6}$/.test(code)) {
    return { error: "Enter the six-digit code." };
  }

  const challenge = await db.customerOtpChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
  });
  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= new Date() ||
    challenge.attempts >= CUSTOMER_OTP_MAX_ATTEMPTS
  ) {
    return { error: "That code expired. Request a new one." };
  }

  if (!customerOtpMatches(token, code, challenge.codeHash)) {
    await db.customerOtpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { attempts: { increment: 1 } },
    });
    return { error: "That code is incorrect." };
  }

  const pendingQuote = challenge.quoteId ? await pendingQuoteClaim(challenge.quoteId) : null;
  try {
    const userId = await db.$transaction(
      async (tx) => {
        const claimed = await tx.customerOtpChallenge.updateMany({
          where: {
            id: challenge.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: CUSTOMER_OTP_MAX_ATTEMPTS },
          },
          data: { consumedAt: new Date() },
        });
        if (claimed.count !== 1) throw new Error("OTP_ALREADY_USED");

        const existing = await tx.user.findUnique({
          where: { email: challenge.email },
          include: { customer: true },
        });
        if (existing && existing.role !== "CUSTOMER") throw new Error("MEMBER_ACCOUNT");

        let user = existing;
        if (!user) {
          user = await tx.user.create({
            data: {
              email: challenge.email,
              passwordHash: await hashPassword(generateAccessPassword()),
              name: challenge.email.split("@")[0].slice(0, 80),
              role: "CUSTOMER",
              emailVerifiedAt: new Date(),
              customer: { create: {} },
            },
            include: { customer: true },
          });
        } else {
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
              customer: user.customer ? undefined : { create: {} },
            },
            include: { customer: true },
          });
        }

        if (pendingQuote && user.customer) {
          if (pendingQuote.customerId && pendingQuote.customerId !== user.customer.id) {
            throw new Error("QUOTE_ALREADY_CLAIMED");
          }
          await tx.quote.updateMany({
            where: { id: pendingQuote.id, customerId: null },
            data: { customerId: user.customer.id },
          });
        }
        return user.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await createSession(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MEMBER_ACCOUNT") {
      return {
        error: "This email belongs to a member workspace. Use member login instead.",
      };
    }
    if (message === "QUOTE_ALREADY_CLAIMED") {
      return { error: "That quote belongs to another account. Request a fresh quote." };
    }
    return { error: "The code could not be verified. Request a new one." };
  }

  redirect(pendingQuote ? `/move/${pendingQuote.id}` : "/");
}

export async function leaveCustomerAuth() {
  const session = await getSession();
  if (session?.user.role === "CUSTOMER") redirect("/");
  redirect("/login");
}
