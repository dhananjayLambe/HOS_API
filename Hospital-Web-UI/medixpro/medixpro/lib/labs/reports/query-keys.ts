import type { ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import type { ReportTasksQueryFilters } from "@/lib/labs/reports/build-report-tasks-query";

/** Stable primitive for React Query — never pass raw filter object identity. */
export function serializeReportTaskFilters(
  filters: ReportTasksQueryFilters,
  tab: ReportTabKey,
): string {
  return JSON.stringify({
    q: filters.search?.trim() ?? "",
    tab,
    status: filters.status ?? "all",
    collectionType: filters.collectionType ?? "all",
    urgency: filters.urgency ?? "all",
    urgentOnly: !!filters.urgentOnly,
    tatOnly: !!filters.tatOnly,
    datePreset: filters.datePreset ?? "month",
  });
}

export const reportTasksQueryKey = (
  branchId: string | null,
  filters: ReportTasksQueryFilters,
  tab: ReportTabKey,
) => ["lab", branchId ?? "unknown", "report-tasks", serializeReportTaskFilters(filters, tab)] as const;

export const reportTaskContextQueryKey = (branchId: string | null, taskId: string | null) =>
  ["lab", branchId ?? "unknown", "report-task-context", taskId ?? "none"] as const;

export const REPORT_TASKS_POLL_MS = 15_000;
export const REPORT_TASKS_STALE_MS = 10_000;

/** Drawer/detail queries — longer than queue to avoid poll jitter. */
export const REPORT_DRAWER_STALE_MS = 60_000;

export const labOrderAssignmentQueryKey = (branchId: string | null, assignmentId: string | null) =>
  ["lab", branchId ?? "unknown", "order-assignment", assignmentId ?? "none"] as const;

export const reportHistoryQueryKey = (branchId: string | null, reportId: string | null) =>
  ["lab", branchId ?? "unknown", "report-history", reportId ?? "none"] as const;

/** Prefix for invalidating all report-task list queries for a branch. */
export const reportsQueueKeyPrefix = (branchId: string | null) =>
  ["lab", branchId ?? "unknown", "report-tasks"] as const;

export const reportDetailQueryKey = (branchId: string | null, reportId: string | null) =>
  ["lab", branchId ?? "unknown", "report-detail", reportId ?? "none"] as const;

export const patientReportsQueryKey = (branchId: string | null, patientId: string | null) =>
  ["lab", branchId ?? "unknown", "patient-reports", patientId ?? "none"] as const;

export const encounterReportsQueryKey = (branchId: string | null, encounterId: string | null) =>
  ["lab", branchId ?? "unknown", "encounter-reports", encounterId ?? "none"] as const;
