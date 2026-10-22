export type ReturnReason = "Too small" | "Too large" | "Not as expected" | "Changed my mind";

export type RefundMethod = "Original payment" | "Store credit";

export type ReturnPhase = "order" | "form" | "submitted";

export interface ReturnState {
  phase: ReturnPhase;
  reason: ReturnReason | null;
  refundMethod: RefundMethod;
}

export const INITIAL_RETURN: ReturnState = {
  phase: "order",
  reason: null,
  refundMethod: "Original payment",
};

export const RETURN_REASONS: { label: ReturnReason; detail: string }[] = [
  { label: "Too small", detail: "The fit is tighter than expected" },
  { label: "Too large", detail: "The fit is looser than expected" },
  { label: "Not as expected", detail: "It looks or feels different" },
  { label: "Changed my mind", detail: "I no longer need it" },
];

export const AUTO_RETURN_STATES: ReturnState[] = [
  INITIAL_RETURN,
  { phase: "form", reason: "Too small", refundMethod: "Original payment" },
  { phase: "submitted", reason: "Too small", refundMethod: "Original payment" },
];
