import crypto from "crypto";
import { db } from "@/lib/db";
import { sendCustomerOtp } from "@/lib/email";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/secure-token";

const OTP_MINUTES = 10;
export const CUSTOMER_OTP_MAX_ATTEMPTS = 5;

function otpHash(token: string, code: string) {
  return hashOpaqueToken(`${token}:${code}`);
}

export async function issueCustomerOtp(email: string, quoteId?: string) {
  const token = createOpaqueToken();
  const devCode =
    process.env.NODE_ENV !== "production" && /^\d{6}$/.test(process.env.CUSTOMER_OTP_DEV_CODE ?? "")
      ? process.env.CUSTOMER_OTP_DEV_CODE!
      : null;
  const code = devCode ?? String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const record = await db.$transaction(async (tx) => {
    await tx.customerOtpChallenge.deleteMany({
      where: { email, consumedAt: null },
    });
    return tx.customerOtpChallenge.create({
      data: {
        tokenHash: hashOpaqueToken(token),
        email,
        quoteId: quoteId ?? null,
        codeHash: otpHash(token, code),
        expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000),
      },
    });
  });

  const delivered = await sendCustomerOtp(email, code).catch(() => false);
  if (!delivered && !devCode) {
    await db.customerOtpChallenge.deleteMany({ where: { id: record.id } });
    return null;
  }
  return { token, devCode };
}

export function customerOtpMatches(token: string, code: string, expectedHash: string) {
  const expected = Buffer.from(expectedHash, "hex");
  const provided = Buffer.from(otpHash(token, code), "hex");
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
