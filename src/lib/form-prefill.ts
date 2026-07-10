// Shared plumbing for "hand a visitor a head start on the request/apply
// wizard instead of a blank form" — used by three growth features that all
// want exactly this: the AI concierge chat (src/components/site/ai-
// concierge.tsx) hands off a structured suggestion, referral links carry a
// ?ref= code through to signup, and the programmatic SEO corridor pages
// link straight into a form pre-scoped to that corridor. All three funnel
// through the same query-param contract so the forms only need to know
// about one mechanism, not three.
//
// Every value is checked against the exact same option lists the forms
// themselves already validate against (src/lib/options.ts) before it's
// ever written into a form field — nothing free-text-from-a-URL flows
// through untouched except a couple of harmless short fields (jurisdiction,
// operatingCountry) that are already free text in the real form and are
// length-capped here as a sanity bound, not a security boundary (the form's
// own Zod schema is still the real validation on submit either way).

import {
  BANK_OPTIONS,
  DAILY_VOLUME_BANDS,
  DIRECTION_VALUES,
  EXPERIENCE_BANDS,
  KYC_READINESS_OPTIONS,
  METHOD_OPTIONS,
  MONTHLY_VOLUME_BANDS,
  REQUEST_TYPE_VALUES,
  RESERVE_BANDS,
  SPEED_OPTIONS,
  URGENCY_VALUES,
} from "@/lib/options";

export type PrefillMap = Record<string, string | string[]>;

const MAX_FREE_TEXT = 200;

type FieldRule = readonly string[] | null; // null = free text (length-capped only)

function buildPrefill(searchParams: URLSearchParams, rules: Record<string, FieldRule>, multi: Set<string>): PrefillMap {
  const out: PrefillMap = {};
  for (const [name, options] of Object.entries(rules)) {
    if (multi.has(name)) {
      const values = searchParams.getAll(name).filter((v) => !options || options.includes(v));
      if (values.length) out[name] = values;
      continue;
    }
    const raw = searchParams.get(name);
    if (!raw) continue;
    if (options) {
      if (options.includes(raw)) out[name] = raw;
      continue;
    }
    if (raw.length <= MAX_FREE_TEXT) out[name] = raw;
  }
  return out;
}

const REQUEST_RULES: Record<string, FieldRule> = {
  requestType: REQUEST_TYPE_VALUES,
  dailyVolumeBand: DAILY_VOLUME_BANDS,
  monthlyVolumeBand: MONTHLY_VOLUME_BANDS,
  requiredSpeed: SPEED_OPTIONS,
  urgency: URGENCY_VALUES,
  jurisdiction: null,
  kycReadiness: KYC_READINESS_OPTIONS,
  banks: BANK_OPTIONS,
  methods: METHOD_OPTIONS,
};
const REQUEST_MULTI = new Set(["banks", "methods"]);

/** Query params understood by the company request form (/request). Applied
    on top of any locally saved draft — an explicit prefill from a link
    represents fresher intent than a stale draft, so it wins field-by-field. */
export function requestFormPrefill(searchParams: URLSearchParams): PrefillMap {
  return buildPrefill(searchParams, REQUEST_RULES, REQUEST_MULTI);
}

const PARTNER_RULES: Record<string, FieldRule> = {
  experienceBand: EXPERIENCE_BANDS,
  dailyCapacityBand: DAILY_VOLUME_BANDS, // same band vocabulary as CAPACITY_BANDS
  reserveBand: RESERVE_BANDS,
  jurisdictions: null,
  operatingCountry: null,
  directions: DIRECTION_VALUES,
  banks: BANK_OPTIONS,
  methods: METHOD_OPTIONS,
};
const PARTNER_MULTI = new Set(["directions", "banks", "methods"]);

/** Query params understood by the partner application form (/apply). */
export function partnerFormPrefill(searchParams: URLSearchParams): PrefillMap {
  return buildPrefill(searchParams, PARTNER_RULES, PARTNER_MULTI);
}

/** Applies a plain field-name → value map onto a live form — the same DOM-
    application step both the draft-restore and the prefill-from-link flows
    need, factored out so it's written (and gets fixed, if it ever needs to
    be) exactly once. Returns whether anything was actually touched. */
export function applyFieldsToForm(form: HTMLFormElement, fields: PrefillMap): boolean {
  let touched = false;
  for (const [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((cb) => {
        cb.checked = value.includes(cb.value);
      });
      touched = true;
    } else {
      const el = form.elements.namedItem(name);
      if (el && "value" in el) {
        // HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement, or a
        // RadioNodeList (multiple same-named radios) — all expose a
        // writable string `value`.
        (el as unknown as { value: string }).value = value;
        touched = true;
      }
    }
  }
  return touched;
}
