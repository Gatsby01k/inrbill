import test from "node:test";
import assert from "node:assert/strict";
import {
  hashOpaqueToken,
  opaqueTokenCandidates,
} from "../src/lib/secure-token";

test("session lookups prefer a one-way token hash", () => {
  const raw = "customer-session-secret";
  const candidates = opaqueTokenCandidates(raw);
  assert.equal(candidates[0], hashOpaqueToken(raw));
  assert.equal(candidates[1], raw);
  assert.notEqual(candidates[0], raw);
});

test("a stored challenge hash remains a compatible fallback candidate", () => {
  const hash = hashOpaqueToken("challenge-secret");
  assert.deepEqual(opaqueTokenCandidates(hash), [hashOpaqueToken(hash), hash]);
});
