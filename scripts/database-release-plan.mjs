export const BASELINE_MIGRATION = "20260715000100_baseline";
export const NETWORK_MIGRATION = "20260715000200_private_network_os";
export const TRANSACTION_MIGRATION = "20260723000100_transaction_engine";

export const BASELINE_TABLES = [
  "User",
  "Session",
  "CompanyProfile",
  "LiquidityRequest",
  "PartnerProfile",
  "Match",
  "Introduction",
  "AuditLog",
];

export const NETWORK_TABLES = [
  "Organization",
  "CompanyPartnerConnection",
  "VerificationCase",
  "VerificationCheck",
  "EvidenceArtifact",
  "CapacityPulse",
  "MatchOffer",
  "Incident",
  "WebhookEvent",
  "RateLimitState",
  "EmailVerificationToken",
  "PasswordResetToken",
];

export const TRANSACTION_TABLES = [
  "CustomerOtpChallenge",
  "CustomerProfile",
  "PaymentMethod",
  "BankAccount",
  "UPIHandle",
  "Wallet",
  "ReceiveProfile",
  "ReceiveProfileFallback",
  "ReceiveLink",
  "Quote",
  "Order",
  "OrderLeg",
  "LiquidityCapacity",
  "Assignment",
  "PaymentAttempt",
  "SettlementAttempt",
  "TransactionEvidence",
  "Dispute",
  "Reconciliation",
];

export function databaseReleasePlan(tableNames, migrationNames) {
  const tables = new Set(tableNames);
  const migrations = new Set(migrationNames);
  const baselinePresent = BASELINE_TABLES.filter((name) => tables.has(name));
  const networkPresent = NETWORK_TABLES.filter((name) => tables.has(name));
  const transactionPresent = TRANSACTION_TABLES.filter((name) => tables.has(name));
  const baselineApplied = migrations.has(BASELINE_MIGRATION);
  const networkApplied = migrations.has(NETWORK_MIGRATION);
  const transactionApplied = migrations.has(TRANSACTION_MIGRATION);

  if (baselinePresent.length === 0 && networkPresent.length === 0 && transactionPresent.length === 0) {
    return { action: "fresh-deploy", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (baselinePresent.length !== BASELINE_TABLES.length) {
    return { action: "blocked-partial-baseline", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (networkPresent.length > 0 && networkPresent.length !== NETWORK_TABLES.length) {
    return { action: "blocked-partial-network", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (transactionPresent.length > 0 && transactionPresent.length !== TRANSACTION_TABLES.length) {
    return { action: "blocked-partial-transaction", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (networkPresent.length === NETWORK_TABLES.length && !networkApplied) {
    return { action: "blocked-untracked-network", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (transactionPresent.length === TRANSACTION_TABLES.length && !transactionApplied) {
    return { action: "blocked-untracked-transaction", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (!baselineApplied) {
    return { action: "resolve-baseline-then-deploy", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (!networkApplied) {
    return { action: "deploy-network", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  if (!transactionApplied) {
    return { action: "deploy-transaction", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
  }

  return { action: "up-to-date", baselinePresent, networkPresent, transactionPresent, baselineApplied, networkApplied, transactionApplied };
}
