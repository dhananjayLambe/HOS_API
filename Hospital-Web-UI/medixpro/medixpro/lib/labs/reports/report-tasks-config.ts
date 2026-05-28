/**
 * Report queue runtime flags.
 *
 * Production default: live v1 API + completion UI (see route page).
 * QA only: ?demo=1 (fixtures), ?legacy=1 (old list rows).
 */

/** Call GET /api/v1/diagnostics/report-tasks/ (Next rewrites to Django). */
export function isReportTasksV1ApiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LAB_REPORTS_USE_V1_API === "false") return false;
  return true;
}

/**
 * @deprecated Demo is selected via ?demo=1 / NEXT_PUBLIC_LAB_REPORTS_DEMO at provider resolution only.
 */
export function shouldIncludeDemoReportTasks(): boolean {
  return process.env.NEXT_PUBLIC_LAB_REPORTS_INCLUDE_DEMO === "true";
}

/**
 * Completion UI is the only production surface; legacy list uses ?legacy=1.
 * @deprecated Env toggle retained for emergency rollback — prefer URL flags.
 */
export function isOrderCompletionUxEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LAB_ORDER_COMPLETION_UX === "false") return false;
  return true;
}

/**
 * Show Live / Mock toggle on reports queue (QA only).
 * Default: hidden. Set NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE=true to show in local dev.
 * Mock fixtures remain available via ?demo=1 without the toggle.
 */
export function isReportsDataSourceToggleVisible(): boolean {
  return process.env.NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE === "true";
}
