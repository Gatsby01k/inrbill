import {
  Prisma,
  type Currency,
  type PaymentMethodStatus,
  type PaymentMethodType,
  type WalletNetwork,
} from "@prisma/client";
import { auditWith } from "@/lib/audit";
import { db } from "@/lib/db";
import { calculateQuote } from "@/lib/quote-engine";
import { createOpaqueToken, createReference, hashOpaqueToken } from "@/lib/secure-token";

export type OrderEngineErrorCode =
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "QUOTE_OWNERSHIP"
  | "COMPLIANCE_REQUIRED"
  | "METHOD_NOT_FOUND"
  | "METHOD_NOT_READY"
  | "METHOD_MISMATCH"
  | "LIMIT_EXCEEDED"
  | "LIQUIDITY_UNAVAILABLE"
  | "RECEIVE_LINK_UNAVAILABLE";

export class OrderEngineError extends Error {
  constructor(
    public readonly code: OrderEngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderEngineError";
  }
}

type Method = Prisma.PaymentMethodGetPayload<{
  include: { bankAccount: true; upiHandle: true; wallet: true };
}>;

function paymentWindowMinutes() {
  const value = Number(process.env.ORDER_PAYMENT_WINDOW_MINUTES ?? "15");
  return Number.isInteger(value) ? Math.min(60, Math.max(5, value)) : 15;
}

function methodUsable(status: PaymentMethodStatus) {
  return !["REJECTED", "DISABLED"].includes(status);
}

function methodPurposeAllows(method: Method, side: "SEND" | "RECEIVE") {
  return method.purpose === "BOTH" || method.purpose === side;
}

function validateMethodPair(
  direction: "INR_TO_USDT" | "USDT_TO_INR",
  source: Method,
  destination: Method,
) {
  const expected: {
    source: readonly PaymentMethodType[];
    destination: readonly PaymentMethodType[];
  } =
    direction === "INR_TO_USDT"
      ? { source: ["BANK_ACCOUNT", "UPI_HANDLE"], destination: ["USDT_WALLET"] }
      : { source: ["USDT_WALLET"], destination: ["BANK_ACCOUNT", "UPI_HANDLE"] };

  if (!expected.source.includes(source.type) || !expected.destination.includes(destination.type)) {
    throw new OrderEngineError(
      "METHOD_MISMATCH",
      "The selected source or destination does not match this move.",
    );
  }
  if (!methodUsable(source.status) || !methodUsable(destination.status)) {
    throw new OrderEngineError("METHOD_NOT_READY", "A selected payment method is unavailable.");
  }
  if (!methodPurposeAllows(source, "SEND") || !methodPurposeAllows(destination, "RECEIVE")) {
    throw new OrderEngineError(
      "METHOD_MISMATCH",
      "A payment method is not enabled for this side of the move.",
    );
  }
  if (source.type === "USDT_WALLET" && !source.wallet?.formatValidatedAt) {
    throw new OrderEngineError("METHOD_NOT_READY", "The source wallet format is not validated.");
  }
  if (destination.type === "USDT_WALLET" && !destination.wallet?.formatValidatedAt) {
    throw new OrderEngineError(
      "METHOD_NOT_READY",
      "The destination wallet format is not validated.",
    );
  }
  if (
    destination.type !== "USDT_WALLET" &&
    destination.status !== "OWNERSHIP_VERIFIED" &&
    process.env.ALLOW_UNVERIFIED_INR_DESTINATIONS !== "true"
  ) {
    throw new OrderEngineError(
      "METHOD_NOT_READY",
      "The INR receive method needs ownership verification before settlement.",
    );
  }
}

function collectionRail(source: Method) {
  if (source.type === "USDT_WALLET") return "BLOCKCHAIN" as const;
  if (source.type === "UPI_HANDLE") return "UPI" as const;
  return "IMPS" as const;
}

function walletNetwork(source: Method, destination: Method): WalletNetwork | null {
  return source.wallet?.network ?? destination.wallet?.network ?? null;
}

function receiveLinkAvailable(link: {
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}) {
  return (
    link.active &&
    (!link.expiresAt || link.expiresAt > new Date()) &&
    (link.maxUses === null || link.useCount < link.maxUses)
  );
}

function currencyAmount(
  quote: { sendCurrency: Currency; receiveCurrency: Currency; sendAmount: Prisma.Decimal; receiveAmount: Prisma.Decimal },
  currency: "INR" | "USDT",
) {
  return quote.sendCurrency === currency ? quote.sendAmount : quote.receiveAmount;
}

async function orderMethods(
  client: Prisma.TransactionClient | typeof db,
  input: {
    customerId: string;
    recipientCustomerId: string | null;
    sourcePaymentMethodId: string;
    destinationPaymentMethodId?: string;
  },
) {
  const source = await client.paymentMethod.findFirst({
    where: { id: input.sourcePaymentMethodId, customerId: input.customerId },
    include: { bankAccount: true, upiHandle: true, wallet: true },
  });
  if (!source) throw new OrderEngineError("METHOD_NOT_FOUND", "Payment source not found.");

  let destination: Method | null = null;
  if (input.recipientCustomerId) {
    const receiveProfile = await client.receiveProfile.findFirst({
      where: {
        customerId: input.recipientCustomerId,
        available: true,
        primaryMethodId: { not: null },
      },
      include: {
        primaryMethod: {
          include: { bankAccount: true, upiHandle: true, wallet: true },
        },
      },
    });
    destination =
      receiveProfile?.primaryMethod?.customerId === input.recipientCustomerId
        ? receiveProfile.primaryMethod
        : null;
  } else {
    destination = await client.paymentMethod.findFirst({
      where: {
        id: input.destinationPaymentMethodId,
        customerId: input.customerId,
      },
      include: { bankAccount: true, upiHandle: true, wallet: true },
    });
  }
  if (!destination) {
    throw new OrderEngineError("METHOD_NOT_FOUND", "Receive destination not found.");
  }
  return { source, destination };
}

function capacityWhere(input: {
  direction: "INR_TO_USDT" | "USDT_TO_INR";
  inrAmount: Prisma.Decimal;
  usdtAmount: Prisma.Decimal;
  rail: "UPI" | "IMPS" | "BLOCKCHAIN";
  network: WalletNetwork | null;
  availableUntil: Date;
}): Prisma.LiquidityCapacityWhereInput {
  return {
    direction: input.direction,
    status: "AVAILABLE",
    availableUntil: { gt: input.availableUntil },
    availableInr: { gte: input.inrAmount },
    availableUsdt: { gte: input.usdtAmount },
    rails: { has: input.rail },
    ...(input.network ? { networks: { has: input.network } } : {}),
    AND: [
      { OR: [{ minInr: null }, { minInr: { lte: input.inrAmount } }] },
      { OR: [{ maxInr: null }, { maxInr: { gte: input.inrAmount } }] },
      { OR: [{ minUsdt: null }, { minUsdt: { lte: input.usdtAmount } }] },
      { OR: [{ maxUsdt: null }, { maxUsdt: { gte: input.usdtAmount } }] },
    ],
    partner: {
      status: "VERIFIED",
      verificationCases: {
        some: { status: "APPROVED", expiresAt: { gt: new Date() } },
      },
    },
  };
}

async function transactionWithRetry<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code);
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("Transaction retry exhausted.");
}

export async function claimQuoteForCustomer(
  quoteId: string,
  customerId: string,
  canClaimUnowned = false,
) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { receiveLink: true },
  });
  if (!quote) throw new OrderEngineError("QUOTE_NOT_FOUND", "Quote not found.");
  if (quote.customerId && quote.customerId !== customerId) {
    throw new OrderEngineError("QUOTE_OWNERSHIP", "Quote belongs to another account.");
  }
  if (!quote.customerId && !canClaimUnowned) {
    throw new OrderEngineError("QUOTE_OWNERSHIP", "Quote ownership could not be verified.");
  }
  if (!quote.customerId) {
    await db.quote.updateMany({
      where: { id: quoteId, customerId: null },
      data: { customerId },
    });
  }
  if (quote.expiresAt <= new Date() || quote.status !== "ACTIVE") {
    if (quote.status === "ACTIVE") {
      await db.quote.updateMany({
        where: { id: quote.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
    }
    throw new OrderEngineError("QUOTE_EXPIRED", "This quote expired. Request a fresh one.");
  }
  if (quote.receiveLink && !receiveLinkAvailable(quote.receiveLink)) {
    throw new OrderEngineError(
      "RECEIVE_LINK_UNAVAILABLE",
      "This payment-request link is no longer available.",
    );
  }
  return db.quote.findUniqueOrThrow({ where: { id: quoteId } });
}

export async function refreshQuoteForCustomer(quoteId: string, customerId: string) {
  const previous = await db.quote.findFirst({
    where: { id: quoteId, customerId },
    include: { receiveLink: true },
  });
  if (!previous) throw new OrderEngineError("QUOTE_NOT_FOUND", "Quote not found.");
  if (previous.status === "CONSUMED") {
    const order = await db.order.findUnique({
      where: { quoteId: previous.id },
      select: { reference: true },
    });
    return { orderReference: order?.reference ?? null, quoteId: null };
  }
  if (previous.receiveLink && !receiveLinkAvailable(previous.receiveLink)) {
    throw new OrderEngineError(
      "RECEIVE_LINK_UNAVAILABLE",
      "This payment-request link is no longer available.",
    );
  }
  const calculated = await calculateQuote(
    previous.direction as "INR_TO_USDT" | "USDT_TO_INR",
    previous.inputAmount.toString(),
    previous.exactSide,
  );
  const fresh = await db.$transaction(async (tx) => {
    await tx.quote.updateMany({
      where: { id: previous.id, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });
    return tx.quote.create({
      data: {
        customerId,
        recipientCustomerId: previous.recipientCustomerId,
        receiveLinkId: previous.receiveLinkId,
        clientTokenHash: hashOpaqueToken(createOpaqueToken()),
        direction: previous.direction,
        exactSide: previous.exactSide,
        inputAmount: calculated.inputAmount,
        sendCurrency: calculated.sendCurrency,
        receiveCurrency: calculated.receiveCurrency,
        sendAmount: calculated.sendAmount,
        receiveAmount: calculated.receiveAmount,
        rate: calculated.rate,
        feeAmount: calculated.feeAmount,
        feeCurrency: calculated.feeCurrency,
        feeBps: calculated.feeBps,
        provider: calculated.provider,
        providerReference: calculated.providerReference,
        sourceMethodHintId: previous.sourceMethodHintId,
        destinationMethodHintId: previous.destinationMethodHintId,
        expiresAt: calculated.expiresAt,
      },
    });
  });
  return { orderReference: null, quoteId: fresh.id };
}

export async function preflightOrder(input: {
  customerId: string;
  quoteId: string;
  sourcePaymentMethodId: string;
  destinationPaymentMethodId?: string;
}) {
  const [quote, customer] = await Promise.all([
    db.quote.findUnique({
      where: { id: input.quoteId },
      include: {
        receiveLink: true,
        recipientCustomer: {
          include: {
            verificationCases: {
              where: { status: "APPROVED", expiresAt: { gt: new Date() } },
              take: 1,
            },
          },
        },
      },
    }),
    db.customerProfile.findUnique({
      where: { id: input.customerId },
      include: {
        verificationCases: {
          where: { status: "APPROVED", expiresAt: { gt: new Date() } },
          take: 1,
        },
      },
    }),
  ]);
  if (!quote) throw new OrderEngineError("QUOTE_NOT_FOUND", "Quote not found.");
  if (quote.customerId !== input.customerId) {
    throw new OrderEngineError("QUOTE_OWNERSHIP", "Quote belongs to another account.");
  }
  if (quote.status !== "ACTIVE" || quote.expiresAt <= new Date()) {
    throw new OrderEngineError("QUOTE_EXPIRED", "This quote expired. Request a fresh one.");
  }
  if (quote.receiveLink && !receiveLinkAvailable(quote.receiveLink)) {
    throw new OrderEngineError(
      "RECEIVE_LINK_UNAVAILABLE",
      "This payment-request link is no longer available.",
    );
  }
  if (
    !customer ||
    customer.complianceStatus !== "VERIFIED" ||
    customer.verificationCases.length === 0
  ) {
    throw new OrderEngineError(
      "COMPLIANCE_REQUIRED",
      "Customer verification must be approved before a move can be confirmed.",
    );
  }
  if (
    quote.recipientCustomerId &&
    (!quote.recipientCustomer ||
      quote.recipientCustomer.complianceStatus !== "VERIFIED" ||
      quote.recipientCustomer.verificationCases.length === 0)
  ) {
    throw new OrderEngineError(
      "COMPLIANCE_REQUIRED",
      "The recipient is not currently available for a compliant move.",
    );
  }

  const inrAmount = currencyAmount(quote, "INR");
  const usdtAmount = currencyAmount(quote, "USDT");
  if (customer.inrPerOrderLimit && inrAmount.gt(customer.inrPerOrderLimit)) {
    throw new OrderEngineError("LIMIT_EXCEEDED", "The amount exceeds your verified INR limit.");
  }
  if (customer.usdtPerOrderLimit && usdtAmount.gt(customer.usdtPerOrderLimit)) {
    throw new OrderEngineError("LIMIT_EXCEEDED", "The amount exceeds your verified USDT limit.");
  }

  const { source, destination } = await orderMethods(db, {
    customerId: input.customerId,
    recipientCustomerId: quote.recipientCustomerId,
    sourcePaymentMethodId: input.sourcePaymentMethodId,
    destinationPaymentMethodId: input.destinationPaymentMethodId,
  });
  validateMethodPair(
    quote.direction as "INR_TO_USDT" | "USDT_TO_INR",
    source,
    destination,
  );
  const rail = collectionRail(source);
  const network = walletNetwork(source, destination);
  const availableUntil = new Date(Date.now() + paymentWindowMinutes() * 60_000);
  const available = await db.liquidityCapacity.count({
    where: capacityWhere({
      direction: quote.direction as "INR_TO_USDT" | "USDT_TO_INR",
      inrAmount,
      usdtAmount,
      rail,
      network,
      availableUntil,
    }),
  });
  if (!available) {
    throw new OrderEngineError(
      "LIQUIDITY_UNAVAILABLE",
      "No verified capacity is currently available for these exact terms.",
    );
  }
  return {
    checks: {
      quote: true,
      limits: true,
      methods: true,
      availability: true,
    },
  };
}

export async function createOrderFromQuote(input: {
  customerId: string;
  quoteId: string;
  sourcePaymentMethodId: string;
  destinationPaymentMethodId?: string;
  idempotencyKey: string;
}) {
  return transactionWithRetry(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, reference: true, customerId: true },
    });
    if (existing) {
      if (existing.customerId !== input.customerId) {
        throw new OrderEngineError("QUOTE_OWNERSHIP", "Idempotency key belongs to another account.");
      }
      return existing;
    }

    const [quote, customer] = await Promise.all([
      tx.quote.findUnique({
        where: { id: input.quoteId },
        include: {
          receiveLink: true,
          recipientCustomer: {
            include: {
              verificationCases: {
                where: { status: "APPROVED", expiresAt: { gt: new Date() } },
                take: 1,
              },
            },
          },
        },
      }),
      tx.customerProfile.findUnique({
        where: { id: input.customerId },
        include: {
          verificationCases: {
            where: { status: "APPROVED", expiresAt: { gt: new Date() } },
            take: 1,
          },
        },
      }),
    ]);
    if (!quote) throw new OrderEngineError("QUOTE_NOT_FOUND", "Quote not found.");
    if (quote.customerId !== input.customerId) {
      throw new OrderEngineError("QUOTE_OWNERSHIP", "Quote belongs to another account.");
    }
    if (quote.status !== "ACTIVE" || quote.expiresAt <= new Date()) {
      if (quote.status === "ACTIVE") {
        await tx.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED" } });
      }
      throw new OrderEngineError("QUOTE_EXPIRED", "This quote expired. Request a fresh one.");
    }
    if (quote.receiveLink && !receiveLinkAvailable(quote.receiveLink)) {
      throw new OrderEngineError(
        "RECEIVE_LINK_UNAVAILABLE",
        "This payment-request link is no longer available.",
      );
    }
    if (
      !customer ||
      customer.complianceStatus !== "VERIFIED" ||
      customer.verificationCases.length === 0
    ) {
      throw new OrderEngineError(
        "COMPLIANCE_REQUIRED",
        "Customer verification must be approved before a move can be confirmed.",
      );
    }
    if (
      quote.recipientCustomerId &&
      (!quote.recipientCustomer ||
        quote.recipientCustomer.complianceStatus !== "VERIFIED" ||
        quote.recipientCustomer.verificationCases.length === 0)
    ) {
      throw new OrderEngineError(
        "COMPLIANCE_REQUIRED",
        "The recipient is not currently available for a compliant move.",
      );
    }

    const inrAmount = currencyAmount(quote, "INR");
    const usdtAmount = currencyAmount(quote, "USDT");
    if (customer.inrPerOrderLimit && inrAmount.gt(customer.inrPerOrderLimit)) {
      throw new OrderEngineError("LIMIT_EXCEEDED", "The amount exceeds your verified INR limit.");
    }
    if (customer.usdtPerOrderLimit && usdtAmount.gt(customer.usdtPerOrderLimit)) {
      throw new OrderEngineError("LIMIT_EXCEEDED", "The amount exceeds your verified USDT limit.");
    }

    const { source, destination } = await orderMethods(tx, {
      customerId: input.customerId,
      recipientCustomerId: quote.recipientCustomerId,
      sourcePaymentMethodId: input.sourcePaymentMethodId,
      destinationPaymentMethodId: input.destinationPaymentMethodId,
    });
    validateMethodPair(
      quote.direction as "INR_TO_USDT" | "USDT_TO_INR",
      source,
      destination,
    );

    const rail = collectionRail(source);
    const network = walletNetwork(source, destination);
    const availableUntil = new Date(Date.now() + paymentWindowMinutes() * 60_000);
    const candidates = await tx.liquidityCapacity.findMany({
      where: capacityWhere({
        direction: quote.direction as "INR_TO_USDT" | "USDT_TO_INR",
        inrAmount,
        usdtAmount,
        rail,
        network,
        availableUntil,
      }),
      orderBy: [{ lastConfirmedAt: "desc" }, { id: "asc" }],
      take: 20,
    });

    let selected: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      const reserved = await tx.liquidityCapacity.updateMany({
        where: {
          id: candidate.id,
          version: candidate.version,
          status: "AVAILABLE",
          availableUntil: { gt: availableUntil },
          availableInr: { gte: inrAmount },
          availableUsdt: { gte: usdtAmount },
        },
        data: {
          availableInr: { decrement: inrAmount },
          reservedInr: { increment: inrAmount },
          availableUsdt: { decrement: usdtAmount },
          reservedUsdt: { increment: usdtAmount },
          version: { increment: 1 },
        },
      });
      if (reserved.count === 1) {
        selected = candidate;
        break;
      }
    }
    if (!selected) {
      throw new OrderEngineError(
        "LIQUIDITY_UNAVAILABLE",
        "Available liquidity changed. Request a fresh quote and try again.",
      );
    }

    const reference = createReference("MOV");
    const order = await tx.order.create({
      data: {
        reference,
        customerId: input.customerId,
        recipientCustomerId: quote.recipientCustomerId,
        quoteId: quote.id,
        sourcePaymentMethodId: source.id,
        destinationPaymentMethodId: destination.id,
        direction: quote.direction,
        status: "AWAITING_PAYMENT",
        sendCurrency: quote.sendCurrency,
        receiveCurrency: quote.receiveCurrency,
        sendAmount: quote.sendAmount,
        receiveAmount: quote.receiveAmount,
        rate: quote.rate,
        feeAmount: quote.feeAmount,
        feeCurrency: quote.feeCurrency,
        idempotencyKey: input.idempotencyKey,
        paymentDeadline: availableUntil,
      },
    });
    const leg = await tx.orderLeg.create({
      data: {
        orderId: order.id,
        sequence: 1,
        status: "AWAITING_PAYMENT",
        sendAmount: quote.sendAmount,
        receiveAmount: quote.receiveAmount,
      },
    });
    await tx.assignment.create({
      data: {
        orderLegId: leg.id,
        partnerId: selected.partnerId,
        liquidityCapacityId: selected.id,
        reservedInr: inrAmount,
        reservedUsdt: usdtAmount,
        idempotencyKey: `assign:${input.idempotencyKey}`,
      },
    });
    await tx.paymentAttempt.create({
      data: {
        orderId: order.id,
        orderLegId: leg.id,
        status: "INSTRUCTIONS_ISSUED",
        rail,
        amount: quote.sendAmount,
        currency: quote.sendCurrency,
        instructionsEncrypted: selected.collectionDetailsEncrypted,
        instructionsMasked: selected.collectionDetailsMasked,
        expiresAt: availableUntil,
      },
    });
    await tx.reconciliation.create({
      data: {
        orderId: order.id,
        expectedSendAmount: quote.sendAmount,
        expectedReceiveAmount: quote.receiveAmount,
      },
    });
    if (quote.receiveLink) {
      const linkConsumed = await tx.receiveLink.updateMany({
        where: {
          id: quote.receiveLink.id,
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          ...(quote.receiveLink.maxUses !== null
            ? { useCount: { lt: quote.receiveLink.maxUses } }
            : {}),
        },
        data: { useCount: { increment: 1 } },
      });
      if (linkConsumed.count !== 1) {
        throw new OrderEngineError(
          "RECEIVE_LINK_UNAVAILABLE",
          "This payment-request link reached its usage or expiry limit.",
        );
      }
    }
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "CONSUMED" },
    });
    await auditWith(tx, {
      action: "order.created",
      entityType: "Order",
      entityId: order.id,
      orderId: order.id,
      actorId: null,
      actorLabel: "Customer",
      meta: {
        reference,
        direction: order.direction,
        status: order.status,
        quoteId: quote.id,
        capacityReservation: "committed",
      },
    });
    return { id: order.id, reference: order.reference };
  });
}
