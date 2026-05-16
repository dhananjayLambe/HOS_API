import type { OrderStatus } from "@/lib/labs/constants/status";

/** Workflow action keys — align with future backend allowed_actions. */
export type LabOrderActionKey =
  | "accept"
  | "reject"
  | "start_processing"
  | "upload_report"
  | "mark_completed";

export const ACTION_LABELS: Record<LabOrderActionKey, string> = {
  accept: "Accept order",
  reject: "Reject",
  start_processing: "Start processing",
  upload_report: "Upload report",
  mark_completed: "Mark completed",
};

const ACTIONS_BY_STATUS: Record<OrderStatus, LabOrderActionKey[]> = {
  PENDING: ["reject", "accept"],
  ACCEPTED: ["start_processing"],
  IN_PROGRESS: ["upload_report", "mark_completed"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** Phase 1: UI-only resolver; Phase 2 replaces body with detail.allowed_actions from API. */
export function resolveAllowedActions(status: OrderStatus): LabOrderActionKey[] {
  return ACTIONS_BY_STATUS[status] ?? [];
}

/** Phase 1: all workflow mutations disabled until backend ships. */
export function isActionEnabled(_key: LabOrderActionKey): boolean {
  return false;
}

export const WORKFLOW_ACTION_DISABLED_HINT =
  "Workflow actions will be available when the lab order API is enabled.";
