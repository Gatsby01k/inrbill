"use client";

import { useState } from "react";

export function EvidenceUpload({ caseId }: { caseId: string }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function upload(form: FormData) {
    const file = form.get("file"); if (!(file instanceof File)) return;
    setBusy(true); setMessage("");
    try {
      const init = await fetch("/api/evidence/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, title: String(form.get("title") || file.name), kind: String(form.get("kind") || "OTHER"), contentType: file.type, byteSize: file.size }) });
      const details = await init.json() as { error?: string; artifactId?: string; uploadUrl?: string; headers?: Record<string, string> };
      if (!init.ok || !details.uploadUrl || !details.artifactId) throw new Error(details.error || "Upload could not start.");
      const sent = await fetch(details.uploadUrl, { method: "PUT", headers: details.headers, body: file }); if (!sent.ok) throw new Error("Encrypted object upload failed.");
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); const checksumSha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const confirmed = await fetch("/api/evidence/upload", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ artifactId: details.artifactId, checksumSha256 }) }); if (!confirmed.ok) throw new Error("Upload confirmation failed.");
      setMessage("Evidence uploaded to the restricted vault. Refresh to see its review state.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); } finally { setBusy(false); }
  }
  return <form action={upload} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input className="input" name="title" placeholder="Document title" required /><select className="input" name="kind" defaultValue="OTHER"><option value="INCORPORATION">Incorporation</option><option value="PAN">PAN</option><option value="BANK_PROOF">Bank proof</option><option value="AML_POLICY">AML policy</option><option value="SOURCE_OF_FUNDS">Source of funds</option><option value="REFERENCE">Reference</option><option value="WALLET_REPORT">Wallet report</option><option value="OTHER">Other</option></select></div><input className="input" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /><button className="btn btn-gold btn-sm" disabled={busy}>{busy ? "Encrypting and uploading…" : "Upload restricted evidence"}</button>{message ? <p className="text-xs text-slate-600">{message}</p> : null}<p className="text-[11px] leading-relaxed text-slate-400">PDF/JPEG/PNG, 10 MB maximum. Objects are private, KMS-encrypted and downloaded through short-lived links.</p></form>;
}
