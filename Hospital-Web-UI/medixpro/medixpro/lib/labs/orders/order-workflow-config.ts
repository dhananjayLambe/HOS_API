import type { LabOrderWorkflowResponse } from "@/lib/labs/api/orders-types";
import type { OrderStatus } from "@/lib/labs/constants/status";
import type { LabOrderRow } from "@/lib/labs/types";

/** Workflow action keys — align with backend operational workflow. */
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

const ENABLED_ACTIONS: Partial<Record<OrderStatus, LabOrderActionKey[]>> = {
  PENDING: ["accept", "reject"],
};

export function resolveAllowedActions(status: OrderStatus): LabOrderActionKey[] {
  return ACTIONS_BY_STATUS[status] ?? [];
}

export function isActionEnabled(key: LabOrderActionKey, status: OrderStatus): boolean {
  return ENABLED_ACTIONS[status]?.includes(key) ?? false;
}

export const WORKFLOW_ACTION_DISABLED_HINT = "This action is not available for the current status.";

function formatWorkflowTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Apply accept/reject API response to a queue/detail row for instant UI sync. */
export function applyWorkflowResponseToRow(
  row: LabOrderRow,
  response: LabOrderWorkflowResponse,
): LabOrderRow {
  const status = response.status;
  return {
    ...row,
    status,
    allowedActions: resolveAllowedActions(status),
    acceptedAt:
      response.accepted_at != null
        ? formatWorkflowTimestamp(response.accepted_at)
        : row.acceptedAt,
    rejectedAt:
      response.rejected_at != null
        ? formatWorkflowTimestamp(response.rejected_at)
        : row.rejectedAt,
    rejectionReason:
      response.rejection_reason !== undefined
        ? response.rejection_reason
        : row.rejectionReason,
  };
}
