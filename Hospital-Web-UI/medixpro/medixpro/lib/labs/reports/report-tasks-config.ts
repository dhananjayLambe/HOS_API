/**
 * Report queue data-source flags (Phase 6 live integration).
 */

/** Call GET /api/v1/diagnostics/report-tasks/ (Next rewrites to Django). */
export function isReportTasksV1ApiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LAB_REPORTS_USE_V1_API === "false") return false;
  return true;
}

/**
 * Merge demo fixtures into live queue — off by default.
 * Enable only for isolated UI review: NEXT_PUBLIC_LAB_REPORTS_INCLUDE_DEMO=true or ?demo=1.
 */
export function shouldIncludeDemoReportTasks(): boolean {
  return process.env.NEXT_PUBLIC_LAB_REPORTS_INCLUDE_DEMO === "true";
}
