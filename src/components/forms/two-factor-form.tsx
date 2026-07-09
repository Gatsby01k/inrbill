"use client";

import { useActionState } from "react";
import { verifyTwoFactor } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/ui";
import type { ActionState } from "@/lib/schemas";

export function TwoFactorForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(verifyTwoFactor, {});
  return (
    <form action={formAction} className="space-y-5">
      <Field label="Authenticator code">
        <input
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="input text-center font-mono text-lg tracking-[0.3em]"
          placeholder="000000"
          maxLength={11}
          autoFocus
        />
      </Field>
      <FormError message={state.error} />
      <SubmitButton className="btn btn-gold w-full" pendingLabel="Verifying…">
        Verify
      </SubmitButton>
      <p className="text-center text-[11px] leading-relaxed text-slate-400">
        Lost your device? Use one of your backup codes instead — same field.
      </p>
    </form>
  );
}
