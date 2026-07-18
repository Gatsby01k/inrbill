import crypto from "crypto";

type VaultConfig = { bucket: string; region: string; endpoint?: string; accessKeyId: string; secretAccessKey: string; kmsKeyId: string };

function config(): VaultConfig {
  const value = { bucket: process.env.EVIDENCE_S3_BUCKET, region: process.env.EVIDENCE_S3_REGION, endpoint: process.env.EVIDENCE_S3_ENDPOINT, accessKeyId: process.env.EVIDENCE_S3_ACCESS_KEY_ID, secretAccessKey: process.env.EVIDENCE_S3_SECRET_ACCESS_KEY, kmsKeyId: process.env.EVIDENCE_S3_KMS_KEY_ID };
  const required = [
    ["EVIDENCE_S3_BUCKET", value.bucket],
    ["EVIDENCE_S3_REGION", value.region],
    ["EVIDENCE_S3_ACCESS_KEY_ID", value.accessKeyId],
    ["EVIDENCE_S3_SECRET_ACCESS_KEY", value.secretAccessKey],
    ["EVIDENCE_S3_KMS_KEY_ID", value.kmsKeyId],
  ] as const;
  const missing = required.filter(([, item]) => !item?.trim()).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Evidence vault is not configured. Missing: ${missing.join(", ")}.`);
  return value as VaultConfig;
}

function encode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`); }
function sha256(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function hmac(key: string | Buffer, value: string) { return crypto.createHmac("sha256", key).update(value).digest(); }
function signingKey(secret: string, date: string, region: string) { return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "s3"), "aws4_request"); }

function target(cfg: VaultConfig, key: string) {
  const cleanKey = key.split("/").map(encode).join("/");
  if (cfg.endpoint) { const endpoint = new URL(cfg.endpoint); return { host: endpoint.host, origin: endpoint.origin, path: `/${encode(cfg.bucket)}/${cleanKey}` }; }
  const host = `${cfg.bucket}.s3.${cfg.region}.amazonaws.com`;
  return { host, origin: `https://${host}`, path: `/${cleanKey}` };
}

function presign(method: "GET" | "PUT", key: string, extraQuery: Record<string, string>, headers: Record<string, string>, expires: number) {
  const cfg = config(); const now = new Date(); const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); const date = amzDate.slice(0, 8); const scope = `${date}/${cfg.region}/s3/aws4_request`; const destination = target(cfg, key);
  const normalizedHeaders = Object.fromEntries(Object.entries({ host: destination.host, ...headers }).map(([name, value]) => [name.toLowerCase(), value.trim()]));
  const signedHeaders = Object.keys(normalizedHeaders).sort().join(";");
  const query: Record<string, string> = { ...extraQuery, "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`, "X-Amz-Date": amzDate, "X-Amz-Expires": String(expires), "X-Amz-SignedHeaders": signedHeaders };
  const canonicalQuery = Object.keys(query).sort().map((name) => `${encode(name)}=${encode(query[name])}`).join("&");
  const canonicalHeaders = Object.keys(normalizedHeaders).sort().map((name) => `${name}:${normalizedHeaders[name]}\n`).join("");
  const canonical = [method, destination.path, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(cfg.secretAccessKey, date, cfg.region)).update(stringToSign).digest("hex");
  return `${destination.origin}${destination.path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function presignEvidenceUpload(key: string, contentType: string) {
  const cfg = config();
  const headers = { "content-type": contentType, "x-amz-server-side-encryption": "aws:kms", "x-amz-server-side-encryption-aws-kms-key-id": cfg.kmsKeyId };
  return { url: presign("PUT", key, {}, headers, 300), headers };
}

export function presignEvidenceDownload(key: string, fileName: string) {
  return presign("GET", key, { "response-content-disposition": `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "response-content-type": "application/octet-stream" }, {}, 120);
}
