import { labelForStatus } from "@/lib/labs/constants/status";

const REPORT_API_TO_DOMAIN: Record<string, string> = {
  pending: "PENDING_UPLOAD",
  in_progress: "UPLOADED",
  ready: "READY_DELIVERY",
  delivered: "DELIVERED",
  rejected: "FAILED_DELIVERY",
  PENDING: "PENDING_UPLOAD",
  IN_PROGRESS: "UPLOADED",
  READY: "READY_DELIVERY",
  DELIVERED: "DELIVERED",
  REJECTED: "FAILED_DELIVERY",
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
