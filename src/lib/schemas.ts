import { z } from "zod";
import {
  BANK_OPTIONS,
  CAPACITY_BANDS,
  COMPLIANCE_FLAG_OPTIONS,
  CURRENCIES,
  DAILY_VOLUME_BANDS,
  DIRECTION_VALUES,
  EXPERIENCE_BANDS,
  INTRO_CHANNELS,
  INTRODUCTION_STATUSES,
  KYC_READINESS_OPTIONS,
  MATCH_STATUSES,
  METHOD_OPTIONS,
  MONTHLY_VOLUME_BANDS,
  NOTE_VISIBILITIES,
  PARTNER_STATUSES,
  REQUEST_STATUSES,
  REQUEST_TYPE_VALUES,
  RESERVE_BANDS,
  REVENUE_STATUSES,
  REVENUE_TYPE_VALUES,
  SPEED_OPTIONS,
  URGENCY_VALUES,
} from "./options";

const trimmed = (min: number, max: number, msg?: string) =>
  z.string().trim().min(min, msg ?? "Required").max(max, `Maximum ${max} characters`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} characters`)
    .optional()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("A valid email is required");

const pick = <T extends readonly [string, ...string[]]>(values: T, msg: string) =>
  z.enum(values, { errorMap: () => ({ message: msg }) });

const multi = (allowed: readonly string[], msg: string) =>
  z
    .array(z.string())
    .min(1, msg)
    .refine((arr) => arr.every((v) => allowed.includes(v)), "Invalid selection");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Accepts either a 6-digit TOTP code or an XXXXX-XXXXX backup code. */
export const twoFactorCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter a code")
  .max(20, "Enter a code");

// Used by first-touch submission flows (company request, partner application)
// where the account password is now generated server-side — the visitor
// only ever types their email, never invents a password mid-form.
export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const companyRequestSchema = z.object({
  // company profile
  companyName: trimmed(2, 120, "Company name is required"),
  website: optionalTrimmed(200),
  companyJurisdiction: trimmed(2, 120, "Registration jurisdiction is required"),
  contactName: trimmed(2, 120, "Contact name is required"),
  contactRole: optionalTrimmed(120),
  telegram: optionalTrimmed(120),
  phone: optionalTrimmed(60),
  // request
  direction: pick(DIRECTION_VALUES, "Select a direction"),
  requestType: pick(REQUEST_TYPE_VALUES, "Select a request type"),
  dailyVolumeBand: pick(DAILY_VOLUME_BANDS, "Select expected daily volume"),
  monthlyVolumeBand: pick(MONTHLY_VOLUME_BANDS, "Select expected monthly volume"),
  ticketSize: optionalTrimmed(120),
  urgency: pick(URGENCY_VALUES, "Select urgency"),
  countriesInvolved: optionalTrimmed(200),
  banks: multi(BANK_OPTIONS, "Select at least one bank"),
  methods: multi(METHOD_OPTIONS, "Select at least one method"),
  requiredSpeed: pick(SPEED_OPTIONS, "Select required speed"),
  jurisdiction: trimmed(2, 200, "Operating jurisdiction is required"),
  kycReadiness: pick(KYC_READINESS_OPTIONS, "Select KYC/KYB readiness"),
  kycNotes: optionalTrimmed(2000),
  partnerRequirements: optionalTrimmed(2000),
  notes: optionalTrimmed(4000),
});

export const partnerApplicationSchema = z.object({
  displayName: trimmed(2, 120, "Operating name is required"),
  legalName: optionalTrimmed(160),
  contactName: trimmed(2, 120, "Contact name is required"),
  telegram: optionalTrimmed(120),
  phone: optionalTrimmed(60),
  experienceBand: pick(EXPERIENCE_BANDS, "Select experience"),
  directions: multi(DIRECTION_VALUES, "Select at least one direction"),
  banks: multi(BANK_OPTIONS, "Select at least one bank"),
  methods: multi(METHOD_OPTIONS, "Select at least one method"),
  dailyCapacityBand: pick(CAPACITY_BANDS, "Select daily capacity"),
  monthlyCapacityBand: optionalTrimmed(120),
  minTicket: optionalTrimmed(80),
  maxTicket: optionalTrimmed(80),
  settlementPreference: optionalTrimmed(200),
  workingHours: trimmed(2, 160, "Working hours are required"),
  reserveBand: pick(RESERVE_BANDS, "Select available reserve"),
  jurisdictions: trimmed(2, 200, "Coverage is required"),
  operatingCountry: optionalTrimmed(120),
  complianceFlags: z
    .array(z.string())
    .refine(
      (arr) => arr.every((v) => (COMPLIANCE_FLAG_OPTIONS as readonly string[]).includes(v)),
      "Invalid selection",
    ),
  complianceNotes: optionalTrimmed(2000),
  references: optionalTrimmed(1000),
  riskNotes: optionalTrimmed(1000),
  additionalComments: optionalTrimmed(2000),
});

export const noteSchema = z.object({
  body: trimmed(2, 4000, "Note text is required"),
  visibility: pick(NOTE_VISIBILITIES, "Select visibility"),
});

export const documentSchema = z.object({
  title: trimmed(2, 160, "Document title is required"),
  url: optionalTrimmed(500),
  note: optionalTrimmed(1000),
  visibility: pick(NOTE_VISIBILITIES, "Select visibility"),
});

export const revenueSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").max(1_000_000_000_000),
  currency: pick(CURRENCIES, "Select currency"),
  type: pick(REVENUE_TYPE_VALUES, "Select revenue type"),
  payerType: optionalTrimmed(40),
  payerName: optionalTrimmed(160),
  basis: optionalTrimmed(400),
  matchId: optionalTrimmed(60),
  dueDate: optionalTrimmed(20),
});

export const retainerSchema = z.object({
  retainerActive: z.coerce.boolean(),
  retainerAmount: z.coerce.number().positive("Amount must be positive").max(1_000_000_000_000).optional(),
  retainerCurrency: pick(CURRENCIES, "Select currency").optional(),
  retainerDayOfMonth: z.coerce.number().int().min(1, "Day 1–28").max(28, "Day 1–28").optional(),
});

export const matchDecisionSchema = z.object({
  confidenceScore: z.coerce.number().int().min(0).max(100).optional(),
  nextAction: optionalTrimmed(300),
});

export const introOutcomeSchema = z.object({
  outcome: optionalTrimmed(1000),
  followUpDate: optionalTrimmed(20),
  // Effective settlement rate, INR per 1 USDT — only meaningful for closed
  // INR_TO_USDT / USDT_TO_INR deals, never required. Feeds the aggregated,
  // gated public reference-rate index — never published per-deal.
  settledRate: z.coerce.number().positive().max(1000).optional(),
});

export const matchCreateSchema = z.object({
  partnerId: trimmed(10, 60, "Select a partner"),
  adminNote: optionalTrimmed(1000),
  confidenceScore: z.coerce.number().int().min(0).max(100).optional(),
});

export const introductionCreateSchema = z.object({
  channel: pick(INTRO_CHANNELS, "Select channel"),
  summary: optionalTrimmed(2000),
});

export const partnerOpsSchema = z.object({
  dailyCapacityBand: pick(CAPACITY_BANDS, "Select daily capacity"),
  monthlyCapacityBand: optionalTrimmed(120),
  minTicket: optionalTrimmed(80),
  maxTicket: optionalTrimmed(80),
  settlementPreference: optionalTrimmed(200),
  workingHours: trimmed(2, 160, "Working hours are required"),
  reserveBand: pick(RESERVE_BANDS, "Select available reserve"),
  banks: multi(BANK_OPTIONS, "Select at least one bank"),
  methods: multi(METHOD_OPTIONS, "Select at least one method"),
});

export const requestStatusSchema = pick(REQUEST_STATUSES, "Invalid status");
export const partnerStatusSchema = pick(PARTNER_STATUSES, "Invalid status");
export const matchStatusSchema = pick(MATCH_STATUSES, "Invalid status");
export const introductionStatusSchema = pick(INTRODUCTION_STATUSES, "Invalid status");
export const revenueStatusSchema = pick(REVENUE_STATUSES, "Invalid status");

export type FieldErrors = Record<string, string>;

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
