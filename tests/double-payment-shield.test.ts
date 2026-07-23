import test from "node:test";
import assert from "node:assert/strict";
import { doublePaymentBlockers } from "../src/lib/double-payment-shield";

test("double-payment shield blocks an existing transfer and proof", () => {
  const blockers = doublePaymentBlockers({
    paymentStatus: "PAYMENT_CONFIRMED",
    paymentAttempts: [{ status: "CONFIRMED", utrHash: "hash", txid: null }],
    settlementAttempts: [
      { status: "SENT", txid: "tx", payoutReferenceHash: null },
    ],
    assignments: [{ id: "a", status: "ACTIVE", evidenceCount: 1 }],
    activeLegCount: 1,
  });
  assert.deepEqual(
    blockers.map((blocker) => blocker.code),
    [
      "PRIOR_SETTLEMENT_ATTEMPT",
      "PENDING_TRANSFER",
      "TXID_EXISTS",
      "PREVIOUS_PROOF_EXISTS",
      "UTR_EXISTS",
    ],
  );
});

test("clean confirmed payment has no reassignment blockers", () => {
  assert.deepEqual(
    doublePaymentBlockers({
      paymentStatus: "PAYMENT_CONFIRMED",
      paymentAttempts: [{ status: "CONFIRMED", utrHash: null, txid: null }],
      settlementAttempts: [],
      assignments: [{ id: "a", status: "ACTIVE", evidenceCount: 0 }],
      activeLegCount: 1,
    }),
    [],
  );
});
