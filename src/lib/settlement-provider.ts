type SettlementRequest = {
  idempotencyKey: string;
  orderReference: string;
  amount: string;
  currency: "INR" | "USDT";
  destination: Record<string, string>;
};

export type SettlementProviderResult = {
  provider: string;
  reference: string;
  status: "ACCEPTED" | "SENT";
  txid?: string;
};

export function settlementProviderConfigured() {
  return Boolean(
    process.env.SETTLEMENT_PROVIDER_URL && process.env.SETTLEMENT_PROVIDER_API_KEY,
  );
}

export async function releaseThroughSettlementProvider(
  request: SettlementRequest,
): Promise<SettlementProviderResult> {
  const url = process.env.SETTLEMENT_PROVIDER_URL;
  const apiKey = process.env.SETTLEMENT_PROVIDER_API_KEY;
  if (!url || !apiKey) {
    throw new Error("A real settlement provider is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": request.idempotencyKey,
      },
      body: JSON.stringify(request),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("The settlement provider could not be reached; transfer state is uncertain.");
  }
  if (!response.ok) {
    throw new Error(`The settlement provider rejected the release (${response.status}).`);
  }
  const payload = (await response.json()) as {
    reference?: unknown;
    status?: unknown;
    txid?: unknown;
  };
  if (
    typeof payload.reference !== "string" ||
    payload.reference.length < 3 ||
    !["accepted", "sent"].includes(String(payload.status).toLowerCase())
  ) {
    throw new Error("The settlement provider returned an invalid acknowledgement.");
  }
  return {
    provider: "SETTLEMENT_PROVIDER",
    reference: payload.reference.slice(0, 160),
    status: String(payload.status).toLowerCase() === "sent" ? "SENT" : "ACCEPTED",
    txid: typeof payload.txid === "string" ? payload.txid : undefined,
  };
}
