"use client";

import { useActionState } from "react";
import { submitPartnerApplication } from "@/app/actions/public";
import { SubmitButton } from "@/components/submit-button";
import {
  CheckboxGrid,
  Field,
  FormError,
  FormSection,
} from "@/components/ui";
import {
  BANK_OPTIONS,
  CAPACITY_BANDS,
  COMPLIANCE_FLAG_OPTIONS,
  DIRECTION_OPTIONS,
  EXPERIENCE_BANDS,
  METHOD_OPTIONS,
  RESERVE_BANDS,
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

export function ApplyForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitPartnerApplication,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="text"
        name="website_hp"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <FormSection
        title="Identity & contact"
        sub="Your operating name is shown to companies only after an introduction is released."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Operating name" error={fe.displayName}>
            <input name="displayName" className="input" placeholder="Desk / brand name" />
          </Field>
          <Field label="Legal entity name" error={fe.legalName} hint="Optional at application stage">
            <input name="legalName" className="input" placeholder="Registered entity" />
          </Field>
          <Field label="Contact name" error={fe.contactName}>
            <input name="contactName" className="input" placeholder="Full name" />
          </Field>
          <Field label="Telegram" error={fe.telegram} hint="Optional">
            <input name="telegram" className="input" placeholder="@handle" />
          </Field>
          <Field label="Phone" error={fe.phone} hint="Optional">
            <input name="phone" className="input" placeholder="+91 …" />
          </Field>
          <Field label="Years of experience" error={fe.experienceBand}>
            <Select name="experienceBand" options={EXPERIENCE_BANDS} placeholder="Select experience" />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Workspace access"
        sub="Creates your partner workspace to track verification status and matched requests."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" error={fe.email}>
            <input name="email" type="email" className="input" placeholder="you@desk.com" />
          </Field>
          <Field label="Password" error={fe.password} hint="Minimum 10 characters">
            <input name="password" type="password" className="input" placeholder="••••••••••" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Coverage & capacity" sub="Declare what you can actually run, day in, day out.">
        <Field label="Supported directions" error={fe.directions}>
          <CheckboxGrid name="directions" options={DIRECTION_OPTIONS} cols={3} />
        </Field>
        <Field label="Supported banks" error={fe.banks}>
          <CheckboxGrid name="banks" options={BANK_OPTIONS} cols={3} />
        </Field>
        <Field label="Methods / rails" error={fe.methods}>
          <CheckboxGrid name="methods" options={METHOD_OPTIONS} cols={3} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Daily capacity" error={fe.dailyCapacityBand}>
            <Select name="dailyCapacityBand" options={CAPACITY_BANDS} placeholder="Select daily capacity" />
          </Field>
          <Field label="Reserve available" error={fe.reserveBand}>
            <Select name="reserveBand" options={RESERVE_BANDS} placeholder="Select reserve band" />
          </Field>
          <Field label="Working hours" error={fe.workingHours} hint="e.g. 09:00–23:00 IST, 7 days">
            <input name="workingHours" className="input" placeholder="Hours + days + timezone" />
          </Field>
          <Field label="Jurisdictions covered" error={fe.jurisdictions}>
            <input name="jurisdictions" className="input" placeholder="e.g. India nationwide" />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Compliance readiness"
        sub="Verification depends on this. Overstating it wastes everyone's time."
      >
        <Field label="What you can evidence today" error={fe.complianceFlags}>
          <CheckboxGrid name="complianceFlags" options={COMPLIANCE_FLAG_OPTIONS} cols={2} />
        </Field>
        <Field label="Compliance notes" error={fe.complianceNotes} hint="Optional — structure, policies, references">
          <textarea name="complianceNotes" rows={3} className="input" placeholder="Anything relevant to verification" />
        </Field>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex items-center justify-between gap-4">
        <p className="max-w-sm text-xs leading-relaxed text-slate-600">
          Applications are reviewed manually. Verification may require documents
          and a call before any introduction is made.
        </p>
        <SubmitButton pendingLabel="Submitting…">Apply to join</SubmitButton>
      </div>
    </form>
  );
}
