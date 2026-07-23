import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  claimQuoteForCustomer,
  createOrderFromQuote,
  OrderEngineError,
} from "@/lib/order-engine";
import { pendingQuoteClaim } from "@/lib/pending-quote";
import { isSameOriginRequest, validIdempotencyKey } from "@/lib/request-security";

const schema = z.object({
  quoteId: z.string().min(20).max(50),
  sourcePaymentMethodId: z.string().min(20).max(50),
  destinationPaymentMethodId: z.string().min(20).max(50).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const session = await getSession();
  if (!session || session.user.role !== "CUSTOMER" || !session.user.customer) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!validIdempotencyKey(idempotencyKey)) {
    return NextResponse.json({ error: "A valid idempotency key is required." }, { status: 400 });
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }

  try {
    const pending = await pendingQuoteClaim(input.quoteId);
    await claimQuoteForCustomer(input.quoteId, session.user.customer.id, Boolean(pending));
    const order = await createOrderFromQuote({
      customerId: session.user.customer.id,
      quoteId: input.quoteId,
      sourcePaymentMethodId: input.sourcePaymentMethodId,
      destinationPaymentMethodId: input.destinationPaymentMethodId,
      idempotencyKey: idempotencyKey!,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderEngineError) {
      const status =
        error.code === "QUOTE_NOT_FOUND"
          ? 404
          : ["QUOTE_EXPIRED", "LIQUIDITY_UNAVAILABLE", "RECEIVE_LINK_UNAVAILABLE"].includes(error.code)
            ? 409
            : ["QUOTE_OWNERSHIP", "COMPLIANCE_REQUIRED"].includes(error.code)
              ? 403
              : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "The order could not be created." }, { status: 500 });
  }
}
