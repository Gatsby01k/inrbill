"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

const VARIANTS = [
  { key: "corridors", label: "Corridors covered" },
  { key: "banks", label: "Banks covered" },
  { key: "partners", label: "Verified partners" },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — code is still
      // fully visible and selectable, so this fails quietly.
    }
  }

  return (
    <div className="rounded-lg border border-black/[0.1] bg-black/[0.02]">
      <div className="flex items-center justify-between gap-2 border-b border-black/[0.07] px-3 py-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] font-medium text-gold-700 transition-colors hover:underline"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function EmbedBadgeSection() {
  const [stat, setStat] = useState<VariantKey>("corridors");

  const badgeUrl = `${SITE_URL}/inr-p2p-index/badge.svg${stat === "corridors" ? "" : `?stat=${stat}`}`;
  const pageUrl = `${SITE_URL}/inr-p2p-index`;
  const html = `<a href="${pageUrl}"><img src="${badgeUrl}" alt="INR P2P Liquidity Index" height="20"></a>`;
  const md = `[![INR P2P Liquidity Index](${badgeUrl})](${pageUrl})`;

  return (
    <div className="card p-6 sm:p-7">
      <p className="text-[13px] font-semibold text-slate-900">Embed this on your site</p>
      <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-slate-500">
        A live badge that reads straight from this index — for listed partners who
        want to show it, or anyone referencing INRP2P coverage elsewhere. It
        updates on its own; you never touch the embed again.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setStat(v.key)}
            className={cn("pill", stat === v.key && "pill-active")}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center rounded-lg border border-black/[0.08] bg-black/[0.02] px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- self-hosted dynamic SVG, next/image adds nothing here */}
        <img src={badgeUrl} alt="INR P2P Liquidity Index badge preview" height={20} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CopyBlock label="HTML" code={html} />
        <CopyBlock label="Markdown" code={md} />
      </div>
    </div>
  );
}
