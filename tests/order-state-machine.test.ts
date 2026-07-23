import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder } from "../src/lib/order-state-machine";

test("customer cannot mark an awaiting-payment order completed", () => {
  assert.equal(canTransitionOrder("AWAITING_PAYMENT", "COMPLETED"), false);
  assert.equal(canTransitionOrder("AWAITING_PAYMENT", "PAYMENT_SUBMITTED"), true);
});

test("settlement lifecycle cannot skip payment confirmation", () => {
  assert.equal(canTransitionOrder("PAYMENT_SUBMITTED", "SETTLEMENT_PENDING"), false);
  assert.equal(canTransitionOrder("PAYMENT_CONFIRMED", "SETTLEMENT_PENDING"), true);
});

test("completed orders are immutable except for a dispute", () => {
  assert.equal(canTransitionOrder("COMPLETED", "SETTLEMENT_SENT"), false);
  assert.equal(canTransitionOrder("COMPLETED", "DISPUTED"), true);
});

test("exception review can resume only through controlled lifecycle states", () => {
  assert.equal(canTransitionOrder("NEEDS_REVIEW", "AWAITING_PAYMENT"), true);
  assert.equal(canTransitionOrder("NEEDS_REVIEW", "SETTLEMENT_PENDING"), true);
  assert.equal(canTransitionOrder("NEEDS_REVIEW", "CONFIRMING"), true);
  assert.equal(canTransitionOrder("NEEDS_REVIEW", "COMPLETED"), false);
});
