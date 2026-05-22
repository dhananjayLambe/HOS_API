/** Non-blocking operational telemetry (no PHI). */

export type ReportMonitorEvent =
  | "queue_fetch_fail"
  | "upload_fail"
  | "upload_duration"
  | "retry_fail"
  | "poll_degraded"
  | "mark_ready_fail";

export type ReportMonitorPayload = {
  taskId?: string;
  reportId?: string;
  requestId?: string;
  durationMs?: number;
  errorCode?: string;
};

export function trackReportEvent(
  name: ReportMonitorEvent,
  payload: ReportMonitorPayload = {},
): void {
  if (process.env.NODE_ENV === "production") return;
  const safe = {
    event: name,
    taskId: payload.taskId,
    reportId: payload.reportId,
    requestId: payload.requestId,
    durationMs: payload.durationMs,
    errorCode: payload.errorCode,
  };
  // eslint-disable-next-line no-console -- dev operational diagnostics only
  console.debug("[report-ops]", safe);
}
