type ShieldInput = {
  paymentStatus: string;
  paymentAttempts: Array<{
    status: string;
    utrHash: string | null;
    txid: string | null;
  }>;
  settlementAttempts: Array<{
    status: string;
    txid: string | null;
    payoutReferenceHash: string | null;
  }>;
  assignments: Array<{
    id: string;
    status: string;
    evidenceCount: number;
  }>;
  activeLegCount: number;
};

export type SettlementBlocker = {
  code:
    | "PRIOR_SETTLEMENT_ATTEMPT"
    | "PENDING_TRANSFER"
    | "TXID_EXISTS"
    | "PAYOUT_REFERENCE_EXISTS"
    | "PREVIOUS_PROOF_EXISTS"
    | "UTR_EXISTS"
    | "CONFLICTING_LEG"
    | "UNCERTAIN_PAYMENT";
  message: string;
};

export function doublePaymentBlockers(input: ShieldInput): SettlementBlocker[] {
  const blockers: SettlementBlocker[] = [];
  if (input.settlementAttempts.length > 0) {
    blockers.push({
      code: "PRIOR_SETTLEMENT_ATTEMPT",
      message: "A settlement attempt already exists.",
    });
  }
  if (
    input.settlementAttempts.some((attempt) =>
      ["CREATED", "PENDING", "IN_PROGRESS", "SENT", "DETECTED"].includes(attempt.status),
    )
  ) {
    blockers.push({ code: "PENDING_TRANSFER", message: "A transfer may still be pending." });
  }
  if (input.settlementAttempts.some((attempt) => Boolean(attempt.txid))) {
    blockers.push({ code: "TXID_EXISTS", message: "A blockchain transaction ID already exists." });
  }
  if (input.settlementAttempts.some((attempt) => Boolean(attempt.payoutReferenceHash))) {
    blockers.push({
      code: "PAYOUT_REFERENCE_EXISTS",
      message: "A payout reference already exists.",
    });
  }
  if (input.assignments.some((assignment) => assignment.evidenceCount > 0)) {
    blockers.push({
      code: "PREVIOUS_PROOF_EXISTS",
      message: "The assigned party has already supplied proof.",
    });
  }
  if (input.paymentAttempts.some((attempt) => Boolean(attempt.utrHash))) {
    blockers.push({ code: "UTR_EXISTS", message: "A payment UTR has already been recorded." });
  }
  if (input.paymentAttempts.some((attempt) => Boolean(attempt.txid))) {
    blockers.push({
      code: "TXID_EXISTS",
      message: "A blockchain payment transaction ID has already been recorded.",
    });
  }
  if (input.activeLegCount > 1) {
    blockers.push({
      code: "CONFLICTING_LEG",
      message: "More than one active order leg exists.",
    });
  }
  if (["PAYMENT_SUBMITTED", "PAYMENT_DETECTED", "NEEDS_REVIEW"].includes(input.paymentStatus)) {
    blockers.push({
      code: "UNCERTAIN_PAYMENT",
      message: "Payment state is not certain enough for reassignment.",
    });
  }
  return blockers.filter(
    (blocker, index, list) => list.findIndex((item) => item.code === blocker.code) === index,
  );
}
