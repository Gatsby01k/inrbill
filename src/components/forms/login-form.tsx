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
    <form action={formAction} className="fin-login-form">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email">
        <input name="email" type="email" className="input" placeholder="name@company.com" autoComplete="email" autoFocus required spellCheck={false} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" className="input" placeholder="Enter your password" autoComplete="current-password" required />
      </Field>
      <div className="fin-auth-forgot"><Link href="/forgot-password">Forgot password?</Link></div>
      <FormError message={state.error} />
      <SubmitButton className="btn fin-auth-submit w-full" pendingLabel="Opening workspace…">
        Open workspace <span aria-hidden>→</span>
      </SubmitButton>
    </form>
  );
}
