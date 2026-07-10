"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-gold",
  pendingLabel = "Working…",
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  /** Overrides the parent <form>'s action for this button only — lets one
      form offer multiple submit buttons that each call a different server
      action (e.g. "Approve selected" vs "Decline selected"). */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} formAction={formAction}>
      {pending ? pendingLabel : children}
    </button>
  );
}
