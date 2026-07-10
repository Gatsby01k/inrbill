// Central option lists. These drive both form rendering and Zod validation,
// so intake data stays consistent and queryable.

export const DIRECTION_OPTIONS = [
  { value: "INR_TO_USDT", label: "INR → USDT" },
  { value: "USDT_TO_INR", label: "USDT → INR" },
  { value: "INR_PAYOUTS", label: "INR payouts" },
] as const;

export const DIRECTION_VALUES = ["INR_TO_USDT", "USDT_TO_INR", "INR_PAYOUTS"] as const;

// Broader than DIRECTION_VALUES — what a company is asking for, including
// requests that aren't a specific corridor (partner sourcing / other).
export const REQUEST_TYPE_OPTIONS = [
  { value: "INR_PAYOUTS", label: "INR payouts" },
  { value: "INR_LIQUIDITY", label: "INR liquidity" },
  { value: "INR_TO_USDT", label: "INR → USDT" },
  { value: "USDT_TO_INR", label: "USDT → INR" },
  { value: "PARTNER_SOURCING", label: "Partner sourcing" },
  { value: "OTHER", label: "Other" },
] as const;

export const REQUEST_TYPE_VALUES = [
  "INR_PAYOUTS",
  "INR_LIQUIDITY",
  "INR_TO_USDT",
  "USDT_TO_INR",
  "PARTNER_SOURCING",
  "OTHER",
] as const;

export const URGENCY_OPTIONS = [
  { value: "STANDARD", label: "Standard", hint: "Usual review timeline" },
  { value: "URGENT", label: "Urgent", hint: "Needed within days" },
  { value: "CRITICAL", label: "Critical", hint: "Time-sensitive, needs immediate attention" },
] as const;

export const URGENCY_VALUES = ["STANDARD", "URGENT", "CRITICAL"] as const;

export const REVENUE_TYPE_OPTIONS = [
  { value: "REVIEW_FEE", label: "Review fee" },
  { value: "PARTNER_ACCESS", label: "Partner access" },
  { value: "INTRO_FEE", label: "Introduction fee" },
  { value: "SUCCESS_FEE", label: "Success fee" },
  { value: "MONTHLY_RETAINER", label: "Monthly retainer" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const REVENUE_TYPE_VALUES = [
  "REVIEW_FEE",
  "PARTNER_ACCESS",
  "INTRO_FEE",
  "SUCCESS_FEE",
  "MONTHLY_RETAINER",
  "CUSTOM",
] as const;

export const DAILY_VOLUME_BANDS = [
  "Under ₹10 lakh / day",
  "₹10–50 lakh / day",
  "₹50 lakh – ₹2 crore / day",
  "₹2–10 crore / day",
  "Over ₹10 crore / day",
] as const;

export const MONTHLY_VOLUME_BANDS = [
  "Under ₹1 crore / month",
  "₹1–10 crore / month",
  "₹10–50 crore / month",
  "₹50–200 crore / month",
  "Over ₹200 crore / month",
] as const;

export const SPEED_OPTIONS = [
  "Instant (under 15 minutes)",
  "Under 1 hour",
  "Same day",
  "T+1",
  "Flexible",
] as const;

export const BANK_OPTIONS = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "State Bank of India",
  "Kotak Mahindra",
  "Yes Bank",
  "IDFC First",
  "IndusInd",
  "Federal Bank",
  "RBL Bank",
  "Other / any",
] as const;

export const METHOD_OPTIONS = ["IMPS", "NEFT", "RTGS", "UPI", "Bulk bank transfer"] as const;

export const KYC_READINESS_OPTIONS = [
  "Full KYB pack ready",
  "KYC documents available on request",
  "Partial — needs guidance",
  "Not started",
] as const;

export const EXPERIENCE_BANDS = ["Under 1 year", "1–3 years", "3–5 years", "5+ years"] as const;

export const CAPACITY_BANDS = DAILY_VOLUME_BANDS;

export const RESERVE_BANDS = [
  "Under ₹25 lakh",
  "₹25 lakh – ₹1 crore",
  "₹1–5 crore",
  "₹5–20 crore",
  "Over ₹20 crore",
] as const;

export const COMPLIANCE_FLAG_OPTIONS = [
  "Registered business entity",
  "KYB documents available",
  "AML / KYC policy in place",
  "Source-of-funds documentation",
  "Video verification available",
  "Trade references available",
] as const;

export const INTRO_CHANNELS = ["EMAIL", "TELEGRAM", "CALL", "OTHER"] as const;
export const CURRENCIES = ["INR", "USDT", "USD"] as const;

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "MATCHING",
  "INTRODUCED",
  "CLOSED",
  "REJECTED",
] as const;

export const PARTNER_STATUSES = [
  "APPLIED",
  "UNDER_REVIEW",
  "VERIFIED",
  "LIMITED",
  "REJECTED",
  "SUSPENDED",
] as const;

export const MATCH_STATUSES = [
  "SUGGESTED",
  "SHORTLISTED",
  "INTRODUCED",
  "ACCEPTED",
  "DECLINED",
] as const;

export const INTRODUCTION_STATUSES = [
  "PENDING",
  "SENT",
  "RESPONDED",
  "SUCCESSFUL",
  "FAILED",
] as const;

export const REVENUE_STATUSES = [
  "POTENTIAL",
  "QUOTED",
  "AGREED",
  "INVOICED",
  "PAID",
  "CANCELLED",
  "LOST",
  "WAIVED",
] as const;

export const NOTE_VISIBILITIES = ["INTERNAL", "COMPANY", "PARTNER"] as const;

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@inrp2p.com";
/** Direct line to the CEO — the primary "talk to us" Telegram contact. */
export const CONTACT_TELEGRAM =
  process.env.NEXT_PUBLIC_CONTACT_TELEGRAM ?? "INRP2P_CEO";
/** Public announcements / updates channel. */
export const CONTACT_TELEGRAM_CHANNEL =
  process.env.NEXT_PUBLIC_CONTACT_TELEGRAM_CHANNEL ?? "INR_P2P_USDT";
export const CONTACT_LINKEDIN =
  process.env.NEXT_PUBLIC_CONTACT_LINKEDIN ?? "https://www.linkedin.com/company/inrp2p/";
