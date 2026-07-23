import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bindPendingQuote } from "@/lib/pending-quote";
import { calculateQuote, QuoteUnavailableError, quoteToPublicJson } from "@/lib/quote-engine";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, requestIp } from "@/lib/request-security";
import { hashOpaqueToken } from "@/lib/secure-token";

export const dynamic = "force-dynamic";

const schema = z.object({
  direction: z.enum(["INR_TO_USDT", "USDT_TO_INR"]),
  exactSide: z.enum(["SEND", "RECEIVE"]),
  amount: z.string().regex(/^\d+(?:\.\d{1,6})?$/).max(30),
  recipientHandle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{2,29}$/)
    .optional(),
  receiveToken: z.string().regex(/^[A-Za-z0-9_-]{32,100}$/).optional(),
  repeatOrderReference: z.string().regex(/^MOV-[A-Z0-9]{8,20}$/).optional(),
}).refine((value) => !(value.recipientHandle && value.receiveToken));

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  if (!(await consumeRateLimit("public-quote", requestIp(request), 120, 15 * 60_000))) {
    return NextResponse.json({ error: "Too many quote requests. Wait a moment." }, { status: 429 });
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  try {
    const [session, handleRecipient, receiveLink] = await Promise.all([
      getSession(),
      input.recipientHandle
        ? db.customerProfile.findFirst({
            where: {
              inrp2pId: input.recipientHandle,
              publicReceiveEnabled: true,
              complianceStatus: "VERIFIED",
              verificationCases: {
                some: { status: "APPROVED", expiresAt: { gt: new Date() } },
              },
              receiveProfile: {
                is: {
                  available: true,
                  primaryMethodId: { not: null },
                  primaryMethod: {
                    is: { status: { notIn: ["UNVERIFIED", "REJECTED", "DISABLED"] } },
                  },
                },
              },
            },
            select: {
              id: true,
              receiveProfile: {
                select: {
                  primaryMethod: { select: { type: true } },
                },
              },
            },
          })
        : Promise.resolve(null),
      input.receiveToken
        ? db.receiveLink.findFirst({
            where: {
              tokenHash: hashOpaqueToken(input.receiveToken),
              active: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              customer: {
                complianceStatus: "VERIFIED",
                verificationCases: {
                  some: { status: "APPROVED", expiresAt: { gt: new Date() } },
                },
                receiveProfile: {
                  is: {
                    available: true,
                    primaryMethodId: { not: null },
                    primaryMethod: {
                      is: {
                        status: {
                          notIn: ["UNVERIFIED", "REJECTED", "DISABLED"],
                        },
                      },
                    },
                  },
                },
              },
            },
            include: {
              customer: {
                select: {
                  id: true,
                  receiveProfile: {
                    select: {
                      primaryMethod: { select: { type: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (input.recipientHandle && !handleRecipient) {
      return NextResponse.json({ error: "This receive page is not available." }, { status: 404 });
    }
    if (
      input.receiveToken &&
      (!receiveLink ||
        (receiveLink.maxUses !== null &&
          receiveLink.useCount >= receiveLink.maxUses))
    ) {
      return NextResponse.json({ error: "This receive page is not available." }, { status: 404 });
    }
    const recipient = handleRecipient ?? receiveLink?.customer ?? null;
    const recipientType = recipient?.receiveProfile?.primaryMethod?.type;
    if (
      recipientType &&
      ((recipientType === "USDT_WALLET" && input.direction !== "INR_TO_USDT") ||
        (recipientType !== "USDT_WALLET" && input.direction !== "USDT_TO_INR"))
    ) {
      return NextResponse.json(
        { error: "The selected direction does not match this receive page." },
        { status: 409 },
      );
    }
    if (
      receiveLink?.amount &&
      (input.exactSide !== "RECEIVE" ||
        !receiveLink.amount.equals(new Prisma.Decimal(input.amount)))
    ) {
      return NextResponse.json(
        { error: "This payment request has a fixed receive amount." },
        { status: 409 },
      );
    }
    const calculation = await calculateQuote(
      input.direction,
      input.amount,
      input.exactSide,
    );
    if (
      receiveLink?.currency &&
      calculation.receiveCurrency !== receiveLink.currency
    ) {
      return NextResponse.json(
        { error: "This payment request does not match the requested currency." },
        { status: 409 },
      );
    }

    const customerId = session?.user.role === "CUSTOMER" ? session.user.customer?.id : null;
    const repeatOrder =
      customerId && input.repeatOrderReference
        ? await db.order.findFirst({
            where: {
              reference: input.repeatOrderReference,
              customerId,
              direction: input.direction,
            },
            select: {
              sourcePaymentMethodId: true,
              destinationPaymentMethodId: true,
            },
          })
        : null;
    const placeholderTokenHash = crypto.randomUUID().replace(/-/g, "").padEnd(64, "0");
    const quote = await db.quote.create({
      data: {
        customerId,
        recipientCustomerId: recipient?.id ?? null,
        receiveLinkId: receiveLink?.id ?? null,
        clientTokenHash: placeholderTokenHash,
        direction: input.direction,
        exactSide: input.exactSide,
        inputAmount: calculation.inputAmount,
        sendCurrency: calculation.sendCurrency,
        receiveCurrency: calculation.receiveCurrency,
        sendAmount: calculation.sendAmount,
        receiveAmount: calculation.receiveAmount,
        rate: calculation.rate,
        feeAmount: calculation.feeAmount,
        feeCurrency: calculation.feeCurrency,
        feeBps: calculation.feeBps,
        provider: calculation.provider,
        providerReference: calculation.providerReference,
        sourceMethodHintId: repeatOrder?.sourcePaymentMethodId ?? null,
        destinationMethodHintId: repeatOrder?.destinationPaymentMethodId ?? null,
        expiresAt: calculation.expiresAt,
      },
    });
    const binding = await bindPendingQuote(quote.id);
    const bound = await db.quote.update({
      where: { id: quote.id },
      data: { clientTokenHash: binding.tokenHash },
    });

    return NextResponse.json({ quote: quoteToPublicJson(bound) });
  } catch (error) {
    if (error instanceof QuoteUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "A quote could not be created." }, { status: 500 });
  }
}
