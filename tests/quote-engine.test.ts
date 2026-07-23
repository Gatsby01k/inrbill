import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote } from "../src/lib/quote-engine";

test("server quote calculates both corridors and exact sides", async () => {
  const previous = {
    rate: process.env.EXECUTION_RATE_INR_PER_USDT,
    fee: process.env.INRP2P_FEE_BPS,
    min: process.env.EXECUTION_MIN_INR,
    max: process.env.EXECUTION_MAX_INR,
  };
  process.env.EXECUTION_RATE_INR_PER_USDT = "87.5";
  process.env.INRP2P_FEE_BPS = "100";
  process.env.EXECUTION_MIN_INR = "100";
  process.env.EXECUTION_MAX_INR = "10000000";
  try {
    const inrToUsdt = await calculateQuote("INR_TO_USDT", "100000", "SEND");
    assert.equal(inrToUsdt.sendAmount.toString(), "100000");
    assert.equal(inrToUsdt.feeAmount.toString(), "1000");
    assert.equal(inrToUsdt.receiveAmount.toString(), "1131.428571");

    const exactInrReceive = await calculateQuote("USDT_TO_INR", "100000", "RECEIVE");
    assert.equal(exactInrReceive.receiveAmount.toString(), "100000");
    assert.equal(exactInrReceive.sendAmount.toString(), "1154.401155");
    assert.equal(exactInrReceive.feeCurrency, "INR");
  } finally {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("EXECUTION_RATE_INR_PER_USDT", previous.rate);
    restore("INRP2P_FEE_BPS", previous.fee);
    restore("EXECUTION_MIN_INR", previous.min);
    restore("EXECUTION_MAX_INR", previous.max);
  }
});
