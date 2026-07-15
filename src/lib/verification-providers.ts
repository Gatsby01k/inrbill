import type { VerificationCheckStatus } from "@prisma/client";

type ProviderKind = "KYB" | "AML" | "BANK" | "WALLET";
type ProviderResult = { provider: string; reference?: string; status: VerificationCheckStatus; summary: string; raw?: unknown };

const CONFIG: Record<ProviderKind, { url: string; key: string }> = {
  KYB: { url: "KYB_PROVIDER_URL", key: "KYB_PROVIDER_API_KEY" },
  AML: { url: "AML_PROVIDER_URL", key: "AML_PROVIDER_API_KEY" },
  BANK: { url: "BANK_PROVIDER_URL", key: "BANK_PROVIDER_API_KEY" },
  WALLET: { url: "WALLET_RISK_PROVIDER_URL", key: "WALLET_RISK_PROVIDER_API_KEY" },
};

export async function runProviderCheck(kind: ProviderKind, checkType: string, subjectReference: string, fields: Record<string, unknown>): Promise<ProviderResult> {
  const config = CONFIG[kind]; const url = process.env[config.url]; const apiKey = process.env[config.key];
  if (!url || !apiKey) return { provider: "MANUAL", status: "REVIEW", summary: `${kind} provider is not configured; accountable manual review required.` };
  try {
    const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ checkType, subjectReference, fields }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return { provider: kind, status: "REVIEW", summary: `${kind} provider returned HTTP ${response.status}; manual review required.` };
    const raw = await response.json() as { status?: string; reference?: string; summary?: string };
    const status = raw.status === "passed" ? "PASSED" : raw.status === "failed" ? "FAILED" : "REVIEW";
    return { provider: kind, reference: raw.reference, status, summary: raw.summary || `${kind} result normalized as ${status}.`, raw };
  } catch {
    return { provider: kind, status: "REVIEW", summary: `${kind} provider was unavailable; manual review required.` };
  }
}
