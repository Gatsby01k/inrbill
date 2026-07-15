import test from "node:test";
import assert from "node:assert/strict";
import { payloadHash, signWebhookBody, verifyWebhookSignature } from "../src/lib/webhook-security";

test("webhook HMAC rejects tampering", () => { const signature = `sha256=${signWebhookBody("secret", "body")}`; assert.equal(verifyWebhookSignature("secret", "body", signature), true); assert.equal(verifyWebhookSignature("secret", "tampered", signature), false); });
test("payload hash is stable", () => assert.equal(payloadHash("same"), payloadHash("same")));
