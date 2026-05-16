import { labelForStatus } from "@/lib/labs/constants/status";

const REPORT_API_TO_DOMAIN: Record<string, string> = {
  pending: "PENDING_UPLOAD",
  in_progress: "UNDER_REVIEW",
  ready: "APPROVED",
  delivered: "DELIVERED",
  rejected: "FAILED",
  PENDING: "PENDING_UPLOAD",
  IN_PROGRESS: "UNDER_REVIEW",
  READY: "APPROVED",
  DELIVERED: "DELIVERED",
  REJECTED: "FAILED",
};

/** Operator-facing label for assignment status (order domain). */
export function assignmentStatusLabel(status: string): string {
  return labelForStatus("order", status);
}

/** Sample pipeline label; null → Pending. */
export function sampleWorkflowLabel(status: string | null | undefined): string {
  if (!status) return "Pending";
  return labelForStatus("sample", status.toUpperCase());
}

/** Report pipeline label; maps API lifecycle values; null → Pending. */
export function reportWorkflowLabel(status: string | null | undefined): string {
  if (!status) return "Pending";
  const normalized = status.toLowerCase();
  const domainKey = REPORT_API_TO_DOMAIN[normalized] ?? REPORT_API_TO_DOMAIN[status];
  if (domainKey) {
    return labelForStatus("report", domainKey);
  }
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
