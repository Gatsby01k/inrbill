"use client";

import { useActionState } from "react";
import {
  requestCustomerOtp,
  verifyCustomerOtp,
  type CustomerOtpState,
} from "@/app/actions/customer-auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/ui";

export function CustomerOtpForm({ quoteId }: { quoteId?: string }) {
  const [requestState, requestAction] = useActionState<CustomerOtpState, FormData>(
    requestCustomerOtp,
    {},
  );
  const [verifyState, verifyAction] = useActionState<CustomerOtpState, FormData>(
    verifyCustomerOtp,
    {},
  );

  if (!requestState.challengeToken) {
    return (
      <form action={requestAction} className="move-auth-form">
        {quoteId ? <input type="hidden" name="quote" value={quoteId} /> : null}
        <Field label="Email">
          <input
            name="email"
            type="email"
            className="input move-auth-input"
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
          />
        </Field>
        <FormError message={requestState.error} />
        <SubmitButton className="move-primary-button" pendingLabel="Sending code…">
          Continue securely
        </SubmitButton>
        <p className="move-auth-note">
          No password. We send one short-lived code and return you to the same move.
        </p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="move-auth-form">
      <input type="hidden" name="challengeToken" value={requestState.challengeToken} />
      <p className="move-auth-sent">
        Code sent to <strong>{requestState.email}</strong>
      </p>
      {requestState.devCode ? (
        <p className="move-dev-code">Development code: {requestState.devCode}</p>
      ) : null}
      <Field label="Six-digit code">
        <input
          name="code"
          type="text"
          className="input move-otp-input"
          placeholder="000000"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus
          required
          aria-describedby="otp-hint"
        />
      </Field>
      <p id="otp-hint" className="sr-only">
        Enter the six digit code sent to your email.
      </p>
      <FormError message={verifyState.error} />
      <SubmitButton className="move-primary-button" pendingLabel="Checking…">
        Confirm and continue
      </SubmitButton>
    </form>
  );
}
