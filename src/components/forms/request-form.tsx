"use client";

import { useActionState } from "react";
import { submitCompanyRequest } from "@/app/actions/public";
import { SubmitButton } from "@/components/submit-button";
import {
  CheckboxGrid,
  Field,
  FormError,
  FormSection,
  RadioCards,
} from "@/components/ui";
import {
  BANK_OPTIONS,
  DAILY_VOLUME_BANDS,
  DIRECTION_OPTIONS,
  KYC_READINESS_OPTIONS,
  METHOD_OPTIONS,
  MONTHLY_VOLUME_BANDS,
  SPEED_OPTIONS,
} from "@/lib/options";
import type { ActionState } from "@/lib/schemas";

function Select({
  name,
  options,
  placeholder,
}: {
  name: string;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <select name={name} className="input" defaultValue="">
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function RequestForm({ loggedInCompany }: { loggedInCompany?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitCompanyRequest,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {/* Honeypot — humans never see or fill this */}
      <input
        type="text"
        name="website_hp"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      {!loggedInCompany && (
        <FormSection
          title="Company & contact"
          sub="Reviewed manually. Never shared until an introduction is released."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company name" error={fe.companyName}>
              <input name="companyName" className="input" placeholder="Acme Payments Ltd" />
            </Field>
            <Field label="Website" error={fe.website} hint="Optional">
              <input name="website" className="input" placeholder="https://" />
            </Field>
            <Field label="Registration jurisdiction" error={fe.companyJurisdiction}>
              <input name="companyJurisdiction" className="input" placeholder="e.g. UAE, Singapore, UK" />
            </Field>
            <Field label="Contact name" error={fe.contactName}>
              <input name="contactName" className="input" placeholder="Full name" />
            </Field>
            <Field label="Role" error={fe.contactRole} hint="Optional">
              <input name="contactRole" className="input" placeholder="e.g. Head of Treasury" />
            </Field>
            <Field label="Telegram" error={fe.telegram} hint="Optional">
              <input name="telegram" className="input" placeholder="@handle" />
            </Field>
            <Field label="Phone" error={fe.phone} hint="Optional" className="sm:col-span-2">
              <input name="phone" className="input" placeholder="+971 …" />
            </Field>
          </div>
        </FormSection>
      )}

      {!loggedInCompany && (
        <FormSection
          title="Workspace access"
          sub="Creates your company workspace to track status, timeline and introductions."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Work email" error={fe.email}>
              <input name="email" type="email" className="input" placeholder="you@company.com" />
            </Field>
            <Field label="Password" error={fe.password} hint="Minimum 10 characters">
              <input name="password" type="password" className="input" placeholder="••••••••••" />
            </Field>
          </div>
        </FormSection>
      )}

      <FormSection
        title="Liquidity requirement"
        sub={
          loggedInCompany
            ? `Submitting as ${loggedInCompany}.`
            : "Be precise — matching runs on these fields."
        }
      >
        <Field label="Direction" error={fe.direction}>
          <RadioCards name="direction" options={DIRECTION_OPTIONS} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Daily volume" error={fe.dailyVolumeBand}>
            <Select name="dailyVolumeBand" options={DAILY_VOLUME_BANDS} placeholder="Select daily volume" />
          </Field>
          <Field label="Monthly volume" error={fe.monthlyVolumeBand}>
            <Select name="monthlyVolumeBand" options={MONTHLY_VOLUME_BANDS} placeholder="Select monthly volume" />
          </Field>
          <Field label="Required speed" error={fe.requiredSpeed}>
            <Select name="requiredSpeed" options={SPEED_OPTIONS} placeholder="Select settlement speed" />
          </Field>
          <Field label="Operating jurisdiction(s)" error={fe.jurisdiction}>
            <input name="jurisdiction" className="input" placeholder="e.g. India + UAE" />
          </Field>
        </div>
        <Field label="Banks" error={fe.banks} hint="Where you need coverage">
          <CheckboxGrid name="banks" options={BANK_OPTIONS} cols={3} />
        </Field>
        <Field label="Methods / rails" error={fe.methods}>
          <CheckboxGrid name="methods" options={METHOD_OPTIONS} cols={3} />
        </Field>
      </FormSection>

      <FormSection
        title="Compliance"
        sub="Your KYB posture determines how quickly an introduction can be released."
      >
        <Field label="KYC / KYB readiness" error={fe.kycReadiness}>
          <Select name="kycReadiness" options={KYC_READINESS_OPTIONS} placeholder="Select readiness" />
        </Field>
        <Field label="KYC / KYB notes" error={fe.kycNotes} hint="Optional — licences, registrations, existing audits">
          <textarea name="kycNotes" rows={3} className="input" placeholder="Anything that speeds up review" />
        </Field>
        <Field label="Anything else" error={fe.notes} hint="Optional">
          <textarea name="notes" rows={3} className="input" placeholder="Context, constraints, timelines" />
        </Field>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex items-center justify-between gap-4">
        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
          By submitting you confirm the information is accurate and that you act
          for the company named above.
        </p>
        <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
      </div>
    </form>
  );
}
