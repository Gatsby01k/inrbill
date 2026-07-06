import Link from "next/link";
import { cn, statusLabel } from "@/lib/format";

/* ── Status badge ─────────────────────────────────────────────────────────── */

const TONES: Record<string, string> = {
  // Request
  SUBMITTED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  IN_REVIEW: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  MATCHING: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  INTRODUCED: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  CLOSED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  // Partner
  APPLIED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  UNDER_REVIEW: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  VERIFIED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  LIMITED: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  SUSPENDED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  // Match
  SUGGESTED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  SHORTLISTED: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  ACCEPTED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  DECLINED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  // Introduction
  PENDING: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  SENT: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  RESPONDED: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  SUCCESSFUL: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  FAILED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  // Revenue
  POTENTIAL: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  INVOICED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  WAIVED: "border-slate-400/30 bg-slate-400/10 text-slate-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("chip", TONES[status] ?? "border-white/15 bg-white/5 text-slate-300", className)}>
      {statusLabel(status)}
    </span>
  );
}

/* ── Layout primitives ────────────────────────────────────────────────────── */

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
        <h1 className="text-xl font-semibold text-slate-50">{title}</h1>
        {sub ? <p className="mt-1 text-[13px] text-slate-500">{sub}</p> : null}
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
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {body ? <p className="mt-1 text-xs text-slate-500">{body}</p> : null}
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
    <div className="card px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "gold" && "text-gold-300",
          tone === "emerald" && "text-emerald-300",
          tone === "default" && "text-slate-100",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-gold-300"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/* ── Form primitives ──────────────────────────────────────────────────────── */

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
      {hint && !error ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs text-rose-400">{error}</span> : null}
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
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
      {items.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/30 has-[:checked]:border-gold-500/50 has-[:checked]:bg-gold-500/[0.07] has-[:checked]:text-white"
        >
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={defaultChecked.includes(o.value)}
            className="h-4 w-4 accent-[#CFA84F]"
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
          className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-3 transition hover:border-gold-500/30 has-[:checked]:border-gold-500/50 has-[:checked]:bg-gold-500/[0.07]"
        >
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              className="h-4 w-4 accent-[#CFA84F]"
            />
            <span className="text-sm font-semibold text-slate-200">{o.label}</span>
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
      <h2 className="text-[15px] font-semibold text-slate-100">{title}</h2>
      {sub ? <p className="mt-1 text-[13px] text-slate-500">{sub}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {message}
    </div>
  );
}
