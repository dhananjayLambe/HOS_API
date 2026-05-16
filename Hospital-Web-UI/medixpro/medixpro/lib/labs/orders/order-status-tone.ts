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
  pending: "bg-[#F3F0FF] text-[#6D4FF5]",
  success: "bg-[#ECFDF3] text-[#027A48]",
  failed: "bg-[#FEF3F2] text-[#B42318]",
  progress: "bg-[#FFF7E8] text-[#B7791F]",
  neutral: "bg-[#F4F1FF] text-[#6B7280]",
};
