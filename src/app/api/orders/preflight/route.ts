import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { OrderEngineError, preflightOrder } from "@/lib/order-engine";
import { isSameOriginRequest } from "@/lib/request-security";

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
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Select valid payment methods." }, { status: 400 });
  }

  try {
    const result = await preflightOrder({
      customerId: session.user.customer.id,
      ...input,
    });
    return NextResponse.json({ ready: true, ...result });
  } catch (error) {
    if (error instanceof OrderEngineError) {
      return NextResponse.json(
        { ready: false, error: error.message, code: error.code },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ready: false, error: "Preflight checks could not complete." },
      { status: 500 },
    );
  }
}
