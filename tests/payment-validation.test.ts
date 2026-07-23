import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAccountNumber,
  normalizeIfsc,
  normalizeTransactionHash,
  normalizeUpiHandle,
  normalizeWalletAddress,
} from "../src/lib/payment-validation";

test("INR payment identifiers are normalized strictly", () => {
  assert.equal(normalizeUpiHandle(" Rahul.Pay@OKHDFC "), "rahul.pay@okhdfc");
  assert.equal(normalizeUpiHandle("not an id"), null);
  assert.equal(normalizeIfsc("hdfc0001234"), "HDFC0001234");
  assert.equal(normalizeIfsc("HDFC123"), null);
  assert.equal(normalizeAccountNumber("1234 5678-9012"), "123456789012");
});

test("wallet address and transaction validation is network-aware", () => {
  assert.equal(
    normalizeWalletAddress("TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj", "TRC20"),
    "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
  );
  assert.equal(
    normalizeWalletAddress(`0x${"A".repeat(40)}`, "ERC20"),
    `0x${"a".repeat(40)}`,
  );
  assert.equal(normalizeWalletAddress(`0x${"A".repeat(39)}`, "POLYGON"), null);
  assert.equal(
    normalizeTransactionHash("A".repeat(64), "TRC20"),
    "a".repeat(64),
  );
});
