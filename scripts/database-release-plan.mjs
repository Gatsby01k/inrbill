export const BASELINE_MIGRATION = "20260715000100_baseline";
export const NETWORK_MIGRATION = "20260715000200_private_network_os";

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

export function databaseReleasePlan(tableNames, migrationNames) {
  const tables = new Set(tableNames);
  const migrations = new Set(migrationNames);
  const baselinePresent = BASELINE_TABLES.filter((name) => tables.has(name));
  const networkPresent = NETWORK_TABLES.filter((name) => tables.has(name));
  const baselineApplied = migrations.has(BASELINE_MIGRATION);
  const networkApplied = migrations.has(NETWORK_MIGRATION);

  if (baselinePresent.length === 0 && networkPresent.length === 0) {
    return { action: "fresh-deploy", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (baselinePresent.length !== BASELINE_TABLES.length) {
    return { action: "blocked-partial-baseline", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (networkPresent.length > 0 && networkPresent.length !== NETWORK_TABLES.length) {
    return { action: "blocked-partial-network", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (networkPresent.length === NETWORK_TABLES.length && !networkApplied) {
    return { action: "blocked-untracked-network", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (!baselineApplied) {
    return { action: "resolve-baseline-then-deploy", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  if (!networkApplied) {
    return { action: "deploy-network", baselinePresent, networkPresent, baselineApplied, networkApplied };
  }

  return { action: "up-to-date", baselinePresent, networkPresent, baselineApplied, networkApplied };
}
