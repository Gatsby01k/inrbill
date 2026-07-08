import type { DocumentRecord, Note } from "@prisma/client";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

const VIS_LABEL: Record<string, string> = {
  INTERNAL: "Internal",
  COMPANY: "Shared · company",
  PARTNER: "Shared · partner",
};

type ServerAction = (formData: FormData) => Promise<void>;

function HiddenFields({ fields }: { fields: Record<string, string> }) {
  return (
    <>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

function Meta({
  author,
  when,
  visibility,
  showVisibility,
}: {
  author: string;
  when: Date;
  visibility: string;
  showVisibility: boolean;
}) {
  return (
    <p className="mt-2 text-[11px] text-slate-400">
      {author} · {fmtDateTime(when)}
      {showVisibility ? (
        <span className="ml-2 rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
          {VIS_LABEL[visibility] ?? visibility}
        </span>
      ) : null}
    </p>
  );
}

/* ── Notes ────────────────────────────────────────────────────── */

export function NoteList({
  notes,
  showVisibility = false,
}: {
  notes: Note[];
  showVisibility?: boolean;
}) {
  if (!notes.length) {
    return (
      <EmptyState title="No notes yet" body="Notes keep the full working history in one place." />
    );
  }
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{n.body}</p>
          <Meta
            author={n.authorLabel}
            when={n.createdAt}
            visibility={n.visibility}
            showVisibility={showVisibility}
          />
        </li>
      ))}
    </ul>
  );
}

export function NoteComposer({
  action,
  hidden,
  visibilityOptions,
  placeholder = "Add a note…",
}: {
  action: ServerAction;
  hidden: Record<string, string>;
  visibilityOptions?: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <form action={action} className="space-y-2.5">
      <HiddenFields fields={hidden} />
      <textarea name="body" rows={3} className="input" placeholder={placeholder} />
      <div className="flex items-center justify-end gap-2">
        {visibilityOptions ? (
          <select
            name="visibility"
            className="input h-9 w-auto py-0 text-xs"
            defaultValue={visibilityOptions[0]?.value}
          >
            {visibilityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Saving…">
          Add note
        </SubmitButton>
      </div>
    </form>
  );
}

/* ── Documents ────────────────────────────────────────────────── */

export function DocumentList({
  documents,
  showVisibility = false,
}: {
  documents: DocumentRecord[];
  showVisibility?: boolean;
}) {
  if (!documents.length) {
    return (
      <EmptyState
        title="No documents yet"
        body="Record document links here — KYB packs, agreements, references."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {documents.map((d) => (
        <li key={d.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-[13px] font-medium text-slate-100">{d.title}</p>
          {d.url ? (
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block break-all text-xs text-gold-400 hover:underline"
            >
              {d.url}
            </a>
          ) : null}
          {d.note ? <p className="mt-1 text-xs text-slate-500">{d.note}</p> : null}
          <Meta
            author={d.authorLabel}
            when={d.createdAt}
            visibility={d.visibility}
            showVisibility={showVisibility}
          />
        </li>
      ))}
    </ul>
  );
}

export function DocumentComposer({
  action,
  hidden,
  visibilityOptions,
}: {
  action: ServerAction;
  hidden: Record<string, string>;
  visibilityOptions?: { value: string; label: string }[];
}) {
  return (
    <form action={action} className="space-y-2.5">
      <HiddenFields fields={hidden} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input name="title" className="input" placeholder="Document title" />
        <input name="url" className="input" placeholder="Link (Drive, Docsend…) — optional" />
      </div>
      <input name="note" className="input" placeholder="Short note — optional" />
      <div className="flex items-center justify-end gap-2">
        {visibilityOptions ? (
          <select
            name="visibility"
            className="input h-9 w-auto py-0 text-xs"
            defaultValue={visibilityOptions[0]?.value}
          >
            {visibilityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
        <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Saving…">
          Add document
        </SubmitButton>
      </div>
    </form>
  );
}
