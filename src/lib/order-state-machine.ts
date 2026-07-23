import type { OrderStatus } from "@prisma/client";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["QUOTED", "CANCELLED"],
  QUOTED: ["QUOTE_EXPIRED", "AWAITING_AUTH", "AWAITING_SETUP", "CANCELLED"],
  QUOTE_EXPIRED: [],
  AWAITING_AUTH: ["AWAITING_SETUP", "QUOTE_EXPIRED", "CANCELLED"],
  AWAITING_SETUP: ["AWAITING_CONFIRMATION", "QUOTE_EXPIRED", "CANCELLED"],
  AWAITING_CONFIRMATION: ["AWAITING_PAYMENT", "QUOTE_EXPIRED", "CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_SUBMITTED", "PAYMENT_DETECTED", "EXPIRED", "CANCELLED", "NEEDS_REVIEW"],
  PAYMENT_SUBMITTED: ["PAYMENT_DETECTED", "PAYMENT_CONFIRMED", "NEEDS_REVIEW", "EXPIRED", "CANCELLED"],
  PAYMENT_DETECTED: ["PAYMENT_CONFIRMED", "NEEDS_REVIEW", "EXPIRED"],
  PAYMENT_CONFIRMED: ["SETTLEMENT_PENDING", "NEEDS_REVIEW", "DISPUTED"],
  SETTLEMENT_PENDING: ["SETTLEMENT_IN_PROGRESS", "NEEDS_REVIEW", "DISPUTED", "FAILED"],
  SETTLEMENT_IN_PROGRESS: ["SETTLEMENT_SENT", "NEEDS_REVIEW", "DISPUTED", "FAILED"],
  SETTLEMENT_SENT: ["CONFIRMING", "COMPLETED", "NEEDS_REVIEW", "DISPUTED", "FAILED"],
  CONFIRMING: ["COMPLETED", "NEEDS_REVIEW", "DISPUTED", "FAILED"],
  COMPLETED: ["DISPUTED"],
  NEEDS_REVIEW: [
    "AWAITING_PAYMENT",
    "PAYMENT_SUBMITTED",
    "PAYMENT_DETECTED",
    "PAYMENT_CONFIRMED",
    "SETTLEMENT_PENDING",
    "SETTLEMENT_IN_PROGRESS",
    "SETTLEMENT_SENT",
    "CONFIRMING",
    "DISPUTED",
    "CANCELLED",
    "FAILED",
  ],
  DISPUTED: ["NEEDS_REVIEW", "COMPLETED", "CANCELLED", "FAILED"],
  CANCELLED: [],
  EXPIRED: ["NEEDS_REVIEW"],
  FAILED: ["NEEDS_REVIEW"],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Order cannot move directly from ${from} to ${to}.`);
  }
}

export const CUSTOMER_ORDER_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Preparing",
  QUOTED: "Quote ready",
  QUOTE_EXPIRED: "Quote expired",
  AWAITING_AUTH: "Confirm your identity",
  AWAITING_SETUP: "Add payment details",
  AWAITING_CONFIRMATION: "Ready to confirm",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_SUBMITTED: "Payment submitted",
  PAYMENT_DETECTED: "Payment detected",
  PAYMENT_CONFIRMED: "Payment confirmed",
  SETTLEMENT_PENDING: "Processing",
  SETTLEMENT_IN_PROGRESS: "Processing",
  SETTLEMENT_SENT: "Sent",
  CONFIRMING: "Confirming",
  COMPLETED: "Completed",
  NEEDS_REVIEW: "Needs attention",
  DISPUTED: "Needs attention",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  FAILED: "Needs attention",
};

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
];
