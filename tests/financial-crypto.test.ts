import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptSensitive,
  encryptSensitive,
  financialFingerprint,
} from "../src/lib/financial-crypto";

const KEY = "11".repeat(32);

test("financial fields use authenticated encryption", () => {
  const previousEncryption = process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
  const previousHmac = process.env.FINANCIAL_DATA_HMAC_KEY;
  process.env.FINANCIAL_DATA_ENCRYPTION_KEY = KEY;
  process.env.FINANCIAL_DATA_HMAC_KEY = "22".repeat(32);
  try {
    const encrypted = encryptSensitive("rahul@bank");
    assert.notEqual(encrypted, "rahul@bank");
    assert.equal(decryptSensitive(encrypted), "rahul@bank");
    assert.equal(
      financialFingerprint(" RAHUL@BANK "),
      financialFingerprint("rahul@bank"),
    );
    const parts = encrypted.split(".");
    parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;
    const tampered = parts.join(".");
    assert.throws(() => decryptSensitive(tampered));
  } finally {
    if (previousEncryption === undefined) {
      delete process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
    } else {
      process.env.FINANCIAL_DATA_ENCRYPTION_KEY = previousEncryption;
    }
    if (previousHmac === undefined) {
      delete process.env.FINANCIAL_DATA_HMAC_KEY;
    } else {
      process.env.FINANCIAL_DATA_HMAC_KEY = previousHmac;
    }
  }
});
