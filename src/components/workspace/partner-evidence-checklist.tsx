"use client";

import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/format";

type Evidence = {
  id: string;
  title: string;
  kind: string;
  status: string;
  mimeType: string;
  byteSize: number;
};

type Step = {
  key: "identity" | "bank" | "wallet" | "video";
  number: string;
  title: string;
  description: string;
  guidance: string;
  kind: string;
  kinds: string[];
  uploadTitle: string;
  accept: string;
  maxBytes: number;
  format: string;
};

const STEPS: Step[] = [
  {
    key: "identity",
    number: "01",
    title: "Verify your identity",
    description: "Upload one government-issued identity document.",
    guidance: "PAN card, masked Aadhaar or passport. Your name and photograph must be clear.",
    kind: "IDENTITY_DOCUMENT",
    kinds: ["IDENTITY_DOCUMENT", "PAN", "DIRECTOR_ID"],
    uploadTitle: "Identity document",
    accept: "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png",
    maxBytes: 10 * 1024 * 1024,
    format: "PDF, JPG or PNG · max 10 MB",
  },
  {
    key: "bank",
    number: "02",
    title: "Confirm your bank account",
    description: "Show that the operating account belongs to you.",
    guidance: "Recent bank statement or cancelled cheque showing account holder, bank and account details.",
    kind: "BANK_PROOF",
    kinds: ["BANK_PROOF"],
    uploadTitle: "Bank account proof",
    accept: "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png",
    maxBytes: 10 * 1024 * 1024,
    format: "PDF, JPG or PNG · max 10 MB",
  },
  {
    key: "wallet",
    number: "03",
    title: "Confirm wallet ownership",
    description: "Connect the USDT settlement wallet to your profile.",
    guidance: "Exchange or wallet screenshot showing the account and receiving address with its network.",
    kind: "WALLET_REPORT",
    kinds: ["WALLET_REPORT"],
    uploadTitle: "Wallet ownership proof",
    accept: "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png",
    maxBytes: 10 * 1024 * 1024,
    format: "PDF, JPG or PNG · max 10 MB",
  },
  {
    key: "video",
    number: "04",
    title: "Record a verification video",
    description: "A short liveness check completes the evidence set.",
    guidance: "15–30 seconds: show your face, hold the same ID and say your full name and “INRP2P verification”.",
    kind: "VIDEO_VERIFICATION",
    kinds: ["VIDEO_VERIFICATION"],
    uploadTitle: "Video verification",
    accept: "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm",
    maxBytes: 50 * 1024 * 1024,
    format: "MP4, MOV or WebM · max 50 MB",
  },
];

function inferContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" } as Record<string, string>)[extension ?? ""] ?? "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadObject(url: string, headers: Record<string, string>, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error("Encrypted object upload failed.")); };
    xhr.onerror = () => reject(new Error("Network interrupted the upload. Please try again."));
    xhr.send(file);
  });
}

function stepState(step: Step, evidence: Evidence[]) {
  const matching = evidence.filter((item) => step.kinds.includes(item.kind));
  if (matching.some((item) => item.status === "ACCEPTED")) return "ACCEPTED";
  if (matching.some((item) => item.status === "PENDING")) return "PENDING";
  if (matching.some((item) => item.status === "REJECTED")) return "REJECTED";
  return "MISSING";
}

function StepIcon({ type }: { type: Step["key"] }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (type === "identity") return <svg {...common}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><circle cx="9" cy="10" r="2" /><path d="M6.5 16c.7-1.8 4.3-1.8 5 0M14.5 9h3M14.5 13h3" /></svg>;
  if (type === "bank") return <svg {...common}><path d="m3 9 9-5 9 5M5 10v7M9.7 10v7M14.3 10v7M19 10v7M3 20h18" /></svg>;
  if (type === "wallet") return <svg {...common}><path d="M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" /><path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" /></svg>;
  return <svg {...common}><rect x="3" y="5" width="14" height="14" rx="3" /><path d="m17 10 4-2v8l-4-2M9 9v6M6 12h6" /></svg>;
}

function StateLabel({ state }: { state: string }) {
  const label = state === "ACCEPTED" ? "Accepted" : state === "PENDING" ? "Under review" : state === "REJECTED" ? "Action required" : "Required";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", state === "ACCEPTED" ? "border-leaf-200 bg-leaf-50 text-leaf-700" : state === "PENDING" ? "border-blue-200 bg-blue-50 text-blue-700" : state === "REJECTED" ? "border-rose-200 bg-rose-50 text-rose-600" : "border-black/[0.08] bg-black/[0.025] text-slate-500")}><span className={cn("h-1.5 w-1.5 rounded-full", state === "ACCEPTED" ? "bg-leaf-500" : state === "PENDING" ? "bg-blue-500" : state === "REJECTED" ? "bg-rose-500" : "bg-slate-300")} />{label}</span>;
}

export function PartnerEvidenceChecklist({ caseId, caseStatus, evidence }: { caseId: string; caseStatus: string; evidence: Evidence[] }) {
  const router = useRouter();
  const baseId = useId().replaceAll(":", "");
  const [active, setActive] = useState<Step["key"] | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ key: Step["key"]; tone: "success" | "error"; text: string } | null>(null);
  const canUpload = caseStatus === "IN_PROGRESS" || caseStatus === "NEEDS_REVIEW";
  const submitted = STEPS.filter((step) => ["PENDING", "ACCEPTED"].includes(stepState(step, evidence))).length;

  async function upload(step: Step, file: File) {
    const contentType = inferContentType(file);
    if (!contentType || file.size > step.maxBytes) {
      setMessage({ key: step.key, tone: "error", text: file.size > step.maxBytes ? `File is too large. ${step.format}.` : `Unsupported file. ${step.format}.` });
      return;
    }
    setActive(step.key); setProgress(0); setMessage(null);
    try {
      const init = await fetch("/api/evidence/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, title: step.uploadTitle, kind: step.kind, contentType, byteSize: file.size }) });
      const details = await init.json() as { error?: string; artifactId?: string; uploadUrl?: string; headers?: Record<string, string> };
      if (!init.ok || !details.uploadUrl || !details.artifactId || !details.headers) throw new Error(details.error || "Upload could not start.");
      await uploadObject(details.uploadUrl, details.headers, file, setProgress);
      setProgress(100);
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const checksumSha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const confirmed = await fetch("/api/evidence/upload", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ artifactId: details.artifactId, checksumSha256 }) });
      if (!confirmed.ok) throw new Error("Upload confirmation failed.");
      setMessage({ key: step.key, tone: "success", text: "Uploaded securely. Awaiting human review." });
      router.refresh();
    } catch (error) {
      setMessage({ key: step.key, tone: "error", text: error instanceof Error ? error.message : "Upload failed. Please try again." });
    } finally {
      setActive(null); setProgress(0);
    }
  }

  function chooseFile(step: Step, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget; const file = input.files?.[0];
    if (file) void upload(step, file);
    input.value = "";
  }

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 rounded-2xl border border-gold-500/20 bg-gold-500/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-700">Secure evidence checklist</p><h2 className="mt-1.5 text-base font-semibold text-slate-900">Complete four verification steps</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">Each file is private, encrypted and visible only to you and the INRP2P review team.</p></div>
      <div className="min-w-40"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-800">{submitted} of 4 submitted</span><span className="text-slate-400">{Math.round((submitted / 4) * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-leaf-500 transition-all duration-500" style={{ width: `${(submitted / 4) * 100}%` }} /></div></div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {STEPS.map((step) => {
        const state = stepState(step, evidence); const matching = evidence.filter((item) => step.kinds.includes(item.kind)); const busy = active === step.key; const inputId = `${baseId}-${step.key}`;
        return <section className={cn("relative min-w-0 overflow-hidden rounded-2xl border bg-white p-4 transition-colors sm:p-5", state === "ACCEPTED" ? "border-leaf-200" : state === "REJECTED" ? "border-rose-200" : "border-black/[0.08]")} key={step.key}>
          <div className="flex items-start gap-3"><div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", state === "ACCEPTED" ? "bg-leaf-50 text-leaf-700" : "bg-gold-500/[0.09] text-gold-700")}><StepIcon type={step.key} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[10px] text-gold-700">{step.number}</span><StateLabel state={state} /></div><h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3><p className="mt-1 text-xs text-slate-500">{step.description}</p></div></div>
          <div className="mt-4 rounded-xl bg-black/[0.025] p-3"><p className="text-[11px] leading-relaxed text-slate-600">{step.guidance}</p><p className="mt-1.5 text-[10px] text-slate-400">{step.format}</p></div>
          {matching.length ? <div className="mt-3 space-y-2">{matching.map((item) => <a className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-black/[0.07] px-3 py-2 text-[11px] hover:border-gold-500/30" href={`/api/evidence/${item.id}`} key={item.id}><span className="min-w-0 truncate font-medium text-slate-700">{item.title}</span><span className={cn("font-semibold", item.status === "ACCEPTED" ? "text-leaf-700" : item.status === "REJECTED" ? "text-rose-600" : "text-blue-700")}>{item.status === "PENDING" ? "Reviewing" : item.status.charAt(0) + item.status.slice(1).toLowerCase()}</span><span className="text-slate-400">{formatBytes(item.byteSize)}</span></a>)}</div> : null}
          <input className="sr-only" id={inputId} type="file" accept={step.accept} disabled={!canUpload || active !== null} onChange={(event) => chooseFile(step, event)} />
          <label className={cn("btn btn-sm mt-4 w-full justify-center", state === "MISSING" || state === "REJECTED" ? "btn-gold" : "btn-ghost", (!canUpload || active !== null) && "pointer-events-none opacity-50")} htmlFor={inputId}>{busy ? `Encrypting and uploading${progress ? ` · ${progress}%` : "…"}` : state === "MISSING" ? step.key === "video" ? "Record or choose video" : "Choose document" : "Upload replacement"}</label>
          {busy ? <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${progress}%` }} /></div> : null}
          {message?.key === step.key ? <p aria-live="polite" className={cn("mt-2 text-[11px]", message.tone === "success" ? "text-leaf-700" : "text-rose-600")}>{message.text}</p> : null}
        </section>;
      })}
    </div>
    {submitted === 4 ? <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-4 text-sm leading-relaxed text-leaf-700"><span className="font-semibold">Evidence set submitted.</span> Status changes only after an operator opens and approves the four restricted files. You will be notified when the Trust Passport is decided.</div> : null}
    {!canUpload ? <p className="text-xs text-slate-500">This verification case is {caseStatus.toLowerCase().replaceAll("_", " ")} and no longer accepts new evidence.</p> : null}
  </div>;
}
