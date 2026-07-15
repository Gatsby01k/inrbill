import type { PartnerStatus, RequestStatus } from "@prisma/client";

const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["MATCHING", "REJECTED"],
  MATCHING: ["INTRODUCED", "CLOSED", "REJECTED"],
  INTRODUCED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

const PARTNER_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  APPLIED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "LIMITED", "REJECTED"],
  VERIFIED: ["LIMITED", "SUSPENDED"],
  LIMITED: ["VERIFIED", "SUSPENDED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  SUSPENDED: ["UNDER_REVIEW", "REJECTED"],
};

export function canTransitionRequest(from: RequestStatus, to: RequestStatus) {
  return from === to || REQUEST_TRANSITIONS[from].includes(to);
}

export function canTransitionPartner(from: PartnerStatus, to: PartnerStatus) {
  return from === to || PARTNER_TRANSITIONS[from].includes(to);
}
