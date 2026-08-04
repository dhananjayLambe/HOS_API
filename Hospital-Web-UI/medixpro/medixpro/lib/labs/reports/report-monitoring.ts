/** Non-blocking operational telemetry (no PHI). */

export type ReportMonitorEvent =
  | "queue_fetch_fail"
  | "upload_fail"
  | "upload_duration"
  | "retry_fail"
  | "whatsapp_fail"
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
  // Dev-only operational telemetry is intentionally silent in the browser console.
  void name;
  void payload;
}
