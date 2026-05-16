import type { OrderStatus } from "@/lib/labs/constants/status";

/** Phase 1 operational status filters — aligned with LabAssignmentStatus (backend). */
export const PHASE1_ORDER_FILTER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

export type Phase1OrderFilterStatus = (typeof PHASE1_ORDER_FILTER_STATUSES)[number];
