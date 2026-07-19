import test from "node:test";
import assert from "node:assert/strict";
import { isValidDepositAmount, isValidTronAddress, normalizeDepositTxHash } from "../src/lib/deposit-policy";

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

test("company wallet must be a checksum-valid mainnet TRON address", () => {
  assert.equal(isValidTronAddress("TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"), true);
  assert.equal(isValidTronAddress("TJNzB4sUGBo8fv7UdeeKQKQUffpfLSXbPP"), true);
  assert.equal(isValidTronAddress("TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdk"), false);
  assert.equal(isValidTronAddress("0x41a614f803b6fd780986a42c78ec9c7f77e6ded13c"), false);
});
