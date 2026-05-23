import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

/**
 * TEMPORARY Phase 6 shim — pick active report head for detail/history fetch.
 * Prefer backend upload_target; do not treat as permanent business logic.
 */
export function resolvePrimaryReportId(context: ReportTaskContext | undefined): string | null {
  if (!context) return null;

  if (context.uploadTarget?.reportId) {
    return context.uploadTarget.reportId;
  }

  const uploadLine = context.activeReports.find((line) =>
    line.availableActions.includes("UPLOAD_REPORT"),
  );
  if (uploadLine?.reportId) return uploadLine.reportId;

  return context.activeReports[0]?.reportId ?? null;
}
