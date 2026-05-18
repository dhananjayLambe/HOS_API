/** Visual tone for order status pills — Phase 1 operational set + API extras. */
export type OrderStatusTone = "pending" | "success" | "failed" | "progress" | "neutral";

const PHASE1_ORDER_TONES: Record<
  "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  OrderStatusTone
> = {
  PENDING: "pending",
  IN_PROGRESS: "progress",
  COMPLETED: "success",
  CANCELLED: "failed",
};

export function orderStatusTone(status: string): OrderStatusTone {
  if (status in PHASE1_ORDER_TONES) {
    return PHASE1_ORDER_TONES[status as keyof typeof PHASE1_ORDER_TONES];
  }
  if (status === "ACCEPTED") return "progress";
  if (status === "REJECTED") return "failed";
  return "neutral";
}

export const ORDER_STATUS_TONE_CLASS: Record<OrderStatusTone, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  failed: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  progress: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/80",
  neutral: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80",
};
