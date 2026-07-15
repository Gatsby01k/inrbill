import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionPartner, canTransitionRequest } from "../src/lib/state-machine";

test("request cannot skip review", () => { assert.equal(canTransitionRequest("SUBMITTED", "MATCHING"), false); assert.equal(canTransitionRequest("SUBMITTED", "IN_REVIEW"), true); });
test("partner cannot self-skip verification", () => { assert.equal(canTransitionPartner("APPLIED", "VERIFIED"), false); assert.equal(canTransitionPartner("APPLIED", "UNDER_REVIEW"), true); });
