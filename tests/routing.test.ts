import test from "node:test";
import assert from "node:assert/strict";
import type { CapacityPulse } from "@prisma/client";
import { rankCandidates, type RoutingCandidate } from "../src/lib/routing";

const now = new Date("2026-07-15T10:00:00Z");
function candidate(overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  const capacity = { id: "cap", partnerId: "p1", status: "AVAILABLE", direction: "INR_TO_USDT", availableBand: "1cr", minTicket: null, maxTicket: null, banks: ["HDFC"], methods: ["BANK"], confirmedAt: now, availableUntil: new Date("2026-07-15T18:00:00Z"), createdAt: now } as CapacityPulse;
  return { partnerId: "p1", directions: ["INR_TO_USDT"], banks: ["HDFC"], methods: ["BANK"], tier: "VERIFIED", verificationApproved: true, incidentCount: 0, capacity, ...overrides };
}
const request = { direction: "INR_TO_USDT" as const, banks: ["HDFC"], methods: ["BANK"] };

test("routing requires approved verification", () => assert.equal(rankCandidates(request, [candidate({ verificationApproved: false })], now).length, 0));
test("routing rejects expired capacity", () => assert.equal(rankCandidates(request, [candidate({ capacity: { ...candidate().capacity!, availableUntil: new Date("2026-07-15T09:00:00Z") } })], now).length, 0));
test("routing is deterministic and penalizes incidents", () => { const ranked = rankCandidates(request, [candidate({ partnerId: "b", incidentCount: 2 }), candidate({ partnerId: "a" })], now); assert.deepEqual(ranked.map((item) => item.partnerId), ["a", "b"]); assert.ok(ranked[0].score > ranked[1].score); });
