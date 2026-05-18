import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

export type PrimaryTaskAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "button"; label: string; actionKey: string };

export function getPrimaryTaskAction(
  taskId: string,
  status: ReportOperationalStatus,
): PrimaryTaskAction {
  switch (status) {
    case "PENDING_UPLOAD":
      return {
        kind: "link",
        label: "Upload report",
        href: `/lab-dashboard/reports/upload?taskId=${encodeURIComponent(taskId)}`,
      };
    case "UPLOADED":
      return { kind: "button", label: "Mark ready", actionKey: "ready" };
    case "READY_DELIVERY":
      return { kind: "button", label: "Send WhatsApp", actionKey: "wa" };
    case "DELIVERED":
      return { kind: "button", label: "Resend", actionKey: "resend" };
    case "FAILED_DELIVERY":
      return { kind: "button", label: "Retry delivery", actionKey: "retry" };
    default:
      return {
        kind: "link",
        label: "Upload report",
        href: `/lab-dashboard/reports/upload?taskId=${encodeURIComponent(taskId)}`,
      };
  }
}
