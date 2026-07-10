"use client";

/** Toggles every checkbox with `name` inside the given form id — used for the
    "select all" header checkbox on bulk-action tables. No React state needed:
    native form submission already collects whichever boxes end up checked. */
export function SelectAllCheckbox({ formId, name }: { formId: string; name: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="h-4 w-4 rounded border-black/20"
      onChange={(e) => {
        const form = document.getElementById(formId);
        if (!(form instanceof HTMLFormElement)) return;
        form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((cb) => {
          cb.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
