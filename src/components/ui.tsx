import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { cn, statusLabel } from "@/lib/format";

/* ── Status badge ─────────────────────────────────────────────
   Gold = brand · Emerald = verification · Blue = information ·
   Red = risk · Gray = structure                                */

const TONE_CLASS = {
  sky: { chip: "border-sky-400/25 bg-sky-400/[0.08] text-sky-200", dot: "bg-sky-400" },
  blue: { chip: "border-blue-400/25 bg-blue-400/[0.08] text-blue-200", dot: "bg-blue-400" },
  gold: { chip: "border-gold-500/30 bg-gold-500/[0.08] text-gold-300", dot: "bg-gold-400" },
  emerald: {
    chip: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200",
    dot: "bg-emerald-400",
  },
  rose: { chip: "border-rose-400/25 bg-rose-400/[0.08] text-rose-200", dot: "bg-rose-400" },
  slate: { chip: "border-white/[0.12] bg-white/[0.04] text-slate-400", dot: "bg-slate-500" },
} as const;

const STATUS_TONE: Record<string, keyof typeof TONE_CLASS> = {
  // Request
  SUBMITTED: "sky",
  IN_REVIEW: "blue",
  MATCHING: "gold",
  INTRODUCED: "gold",
  CLOSED: "emerald",
  REJECTED: "rose",
  // Partner
  APPLIED: "sky",
  UNDER_REVIEW: "blue",
  VERIFIED: "emerald",
  LIMITED: "gold",
  SUSPENDED: "rose",
  // Match
  SUGGESTED: "sky",
  SHORTLISTED: "blue",
  ACCEPTED: "emerald",
  DECLINED: "rose",
  // Introduction
  PENDING: "slate",
  SENT: "sky",
  RESPONDED: "blue",
  SUCCESSFUL: "emerald",
  FAILED: "rose",
  // Revenue
  POTENTIAL: "sky",
  INVOICED: "gold",
  PAID: "emerald",
  WAIVED: "slate",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE_CLASS[STATUS_TONE[status] ?? "slate"];
  return (
    <span className={cn("chip", tone.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {statusLabel(status)}
    </span>
  );
}

/* ── Layout primitives ────────────────────────────────────────── */

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.01em] text-slate-50">{title}</h1>
        {sub ? <p className="mt-1 max-w-2xl text-[13px] text-slate-500">{sub}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.015] px-6 py-10 text-center">
      <BrandMark size={26} className="opacity-30 saturate-[0.6]" />
      <p className="mt-3 text-[13px] font-medium text-slate-300">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-600">{body}</p> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "gold" | "emerald";
}) {
  return (
    <div className="card px-4 py-3 transition-colors hover:border-white/[0.14]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.01em]",
          tone === "gold" && "text-gold-300",
          tone === "emerald" && "text-emerald-300",
          tone === "default" && "text-slate-100",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[11px] text-slate-600">{sub}</p> : null}
    </div>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] leading-snug text-slate-200">{children}</dd>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-gold-300"
    >
      <span aria-hidden className="text-[13px] leading-none">
        ←
      </span>
      {label}
    </Link>
  );
}

/* ── Form primitives ──────────────────────────────────────────── */

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="lbl">{label}</span>
      {children}
      {hint && !error ? (
        <span className="mt-1.5 block text-[11.5px] text-slate-600">{hint}</span>
      ) : null}
      {error ? <span className="mt-1.5 block text-[11.5px] text-rose-400">{error}</span> : null}
    </label>
  );
}

export function CheckboxGrid({
  name,
  options,
  defaultChecked = [],
  cols = 2,
}: {
  name: string;
  options: readonly (string | { value: string; label: string })[];
  defaultChecked?: readonly string[];
  cols?: 2 | 3;
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label },
  );
  return (
    <div
      className={cn(
        "grid gap-2",
        cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {items.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.09] bg-white/[0.015] px-3 py-2 text-[13px] text-slate-300 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.03] has-[:checked]:border-gold-500/45 has-[:checked]:bg-gold-500/[0.06] has-[:checked]:text-white"
        >
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={defaultChecked.includes(o.value)}
            className="h-3.5 w-3.5 accent-[#EFA12F]"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function RadioCards({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { value: string; label: string; hint?: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-white/[0.09] bg-white/[0.015] px-3.5 py-3 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.03] has-[:checked]:border-gold-500/45 has-[:checked]:bg-gold-500/[0.06]"
        >
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              className="h-3.5 w-3.5 accent-[#EFA12F]"
            />
            <span className="text-[13px] font-semibold text-slate-200">{o.label}</span>
          </span>
          {o.hint ? <span className="ml-6 text-xs text-slate-500">{o.hint}</span> : null}
        </label>
      ))}
    </div>
  );
}

export function FormSection({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 sm:p-7">
      <div className="border-b border-white/[0.06] pb-4">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-100">{title}</h2>
        {sub ? <p className="mt-1 text-[12.5px] text-slate-500">{sub}</p> : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-[13px] text-rose-200">
      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
      {message}
    </div>
  );
}
