"use client";

import { useActionState } from "react";
import { requestPasswordReset, resendEmailVerification, resetPassword, setWorkspacePassword } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/ui";
import type { ActionState } from "@/lib/schemas";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(requestPasswordReset, {});
  if (state.ok) return <p className="rounded-lg border border-leaf-400/25 bg-leaf-400/[0.06] p-4 text-xs leading-relaxed text-leaf-700">If an account exists, a single-use reset link has been sent. Check spam as well.</p>;
  return <form action={action} className="space-y-5"><Field label="Account email"><input className="input" name="email" type="email" autoComplete="email" required /></Field><FormError message={state.error} /><SubmitButton className="btn btn-gold w-full" pendingLabel="Sending…">Send reset link</SubmitButton></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetPassword, {});
  if (state.ok) return <div className="space-y-4"><p className="rounded-lg border border-leaf-400/25 bg-leaf-400/[0.06] p-4 text-xs text-leaf-700">Password changed and every active session was revoked.</p><a href="/login" className="btn btn-gold w-full">Return to login</a></div>;
  return <form action={action} className="space-y-5"><input type="hidden" name="token" value={token} /><Field label="New password" hint="14+ characters, uppercase, lowercase and a number"><input className="input" name="password" type="password" autoComplete="new-password" required /></Field><Field label="Confirm password"><input className="input" name="confirm" type="password" autoComplete="new-password" required /></Field><FormError message={state.error} /><SubmitButton className="btn btn-gold w-full" pendingLabel="Changing…">Change password</SubmitButton></form>;
}

export function WorkspacePasswordForm({ bootstrap }: { bootstrap: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(setWorkspacePassword, {});
  return <form action={action} className="space-y-5">{!bootstrap ? <Field label="Current password"><input className="input" name="current" type="password" autoComplete="current-password" required /></Field> : null}<Field label="New password" hint="14+ characters, uppercase, lowercase and a number"><input className="input" name="password" type="password" autoComplete="new-password" required /></Field><Field label="Confirm password"><input className="input" name="confirm" type="password" autoComplete="new-password" required /></Field><FormError message={state.error} />{state.ok ? <p className="rounded-lg border border-leaf-400/25 bg-leaf-400/[0.06] p-3 text-xs text-leaf-700">Password saved. Other sessions were revoked.</p> : null}<SubmitButton className="btn btn-gold w-full" pendingLabel="Saving…">{bootstrap ? "Set workspace password" : "Change password"}</SubmitButton></form>;
}

export function EmailVerificationButton() {
  const [state, action] = useActionState<ActionState, FormData>(resendEmailVerification, {});
  return <form action={action} className="mt-4"><FormError message={state.error} />{state.ok ? <p className="mb-3 text-xs text-leaf-700">Verification email sent.</p> : null}<SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Sending…">Send verification email</SubmitButton></form>;
}
