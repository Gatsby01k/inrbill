import test from "node:test";
import assert from "node:assert/strict";
import {
  formatIndianNumber,
  parseIndianAmount,
} from "../src/lib/amount";

test("smart amount input understands Indian shorthand", () => {
  assert.deepEqual(parseIndianAmount("50k"), { ok: true, value: "50000" });
  assert.deepEqual(parseIndianAmount("1l"), { ok: true, value: "100000" });
  assert.deepEqual(parseIndianAmount("2.5 lakh"), { ok: true, value: "250000" });
  assert.deepEqual(parseIndianAmount("1 crore"), { ok: true, value: "10000000" });
  assert.deepEqual(parseIndianAmount("₹1,00,000"), { ok: true, value: "100000" });
});

test("max is explicit and input bounds are enforced", () => {
  assert.deepEqual(parseIndianAmount("max"), {
    ok: false,
    reason: "max-unavailable",
  });
  assert.deepEqual(parseIndianAmount("max", { max: "250000" }), {
    ok: true,
    value: "250000",
  });
  assert.deepEqual(parseIndianAmount("2cr", { maximum: 10_000_000 }), {
    ok: false,
    reason: "out-of-range",
  });
});

test("amounts render with Indian digit grouping", () => {
  assert.equal(formatIndianNumber("12345678.5", 2), "1,23,45,678.5");
});
