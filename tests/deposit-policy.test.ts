import test from "node:test";
import assert from "node:assert/strict";
import { isValidDepositAmount, normalizeDepositTxHash, providerDepositStatus } from "../src/lib/deposit-policy";

test("deposit amount policy rejects ambiguous or unsafe values", () => {
  assert.equal(isValidDepositAmount("300"), true);
  assert.equal(isValidDepositAmount("300.123456"), true);
  assert.equal(isValidDepositAmount("9.99"), false);
  assert.equal(isValidDepositAmount("300.1234567"), false);
  assert.equal(isValidDepositAmount("3e2"), false);
  assert.equal(isValidDepositAmount("1000001"), false);
});

test("transaction hashes are canonical and strict", () => {
  const hash = "A".repeat(64);
  assert.equal(normalizeDepositTxHash(hash), "a".repeat(64));
  assert.equal(normalizeDepositTxHash(`0x${hash}`), "a".repeat(64));
  assert.equal(normalizeDepositTxHash("not-a-transaction"), null);
});

test("provider only confirms exact-enough USDT TRC20 deposits", () => {
  assert.equal(providerDepositStatus({ current: "CONFIRMING", providerStatus: "finished", paid: 300, expected: 300, payCurrency: "usdttrc20" }), "CONFIRMED");
  assert.equal(providerDepositStatus({ current: "CONFIRMING", providerStatus: "finished", paid: 200, expected: 300, payCurrency: "usdttrc20" }), "CONFIRMING");
  assert.equal(providerDepositStatus({ current: "CONFIRMING", providerStatus: "finished", paid: 999_999, expected: 1_000_000, payCurrency: "usdttrc20" }), "CONFIRMING");
  assert.equal(providerDepositStatus({ current: "CONFIRMING", providerStatus: "finished", paid: 300, expected: 300, payCurrency: "usdterc20" }), "CONFIRMING");
  assert.equal(providerDepositStatus({ current: "REFUNDED", providerStatus: "finished", paid: 300, expected: 300, payCurrency: "usdttrc20" }), "REFUNDED");
});
