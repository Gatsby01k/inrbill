import test from "node:test";
import assert from "node:assert/strict";
import { presignEvidenceDownload, presignEvidenceUpload, presignEvidenceView } from "../src/lib/s3-presign";

function env() { process.env.EVIDENCE_S3_BUCKET = "vault"; process.env.EVIDENCE_S3_REGION = "ap-south-1"; process.env.EVIDENCE_S3_ACCESS_KEY_ID = "AKIATEST"; process.env.EVIDENCE_S3_SECRET_ACCESS_KEY = "secret-test"; process.env.EVIDENCE_S3_KMS_KEY_ID = "kms-test"; }
test("evidence upload signature requires KMS headers", () => { env(); const signed = presignEvidenceUpload("verification/case/file", "application/pdf"); assert.equal(signed.headers["x-amz-server-side-encryption"], "aws:kms"); assert.equal(signed.headers["x-amz-server-side-encryption-aws-kms-key-id"], "kms-test"); assert.match(signed.url, /X-Amz-Expires=300/); });
test("evidence view is short-lived and opens inline with its real MIME type", () => { env(); const url = presignEvidenceView("verification/case/file", "proof.pdf", "application/pdf"); assert.match(url, /X-Amz-Expires=120/); assert.match(decodeURIComponent(url), /inline; filename="proof.pdf"/); assert.match(decodeURIComponent(url), /response-content-type=application\/pdf/); });
test("explicit evidence download remains available", () => { env(); const url = presignEvidenceDownload("verification/case/file", "proof.pdf", "application/pdf"); assert.match(url, /X-Amz-Expires=120/); assert.match(decodeURIComponent(url), /attachment; filename="proof.pdf"/); });
