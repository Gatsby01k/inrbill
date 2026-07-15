"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/ui";
import type { ActionState } from "@/lib/schemas";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(login, {});
  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email">
        <input name="email" type="email" className="input" placeholder="you@company.com" autoComplete="email" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" className="input" placeholder="••••••••••" autoComplete="current-password" />
      </Field>
      <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs text-gold-700 hover:underline">Forgot password?</Link></div>
      <FormError message={state.error} />
      <SubmitButton className="btn btn-gold w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
