/**
 * Debug-mode NDJSON: sends to the debug ingest and (in development) to a local
 * API route that appends to `.cursor/debug-bb2dcf.log` so the agent can read
 * results when the external ingest is unreachable from the browser.
 */
const INGEST = "http://127.0.0.1:7915/ingest/aedb6968-76c2-48f6-8e61-0fae7debd36f";
const SESSION = "bb2dcf";

type DebugPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
};

export function debugSessionLog(payload: DebugPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    sessionId: SESSION,
    ...payload,
    timestamp: Date.now(),
  });
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body,
  }).catch(() => {});
  if (process.env.NODE_ENV === "development") {
    void fetch("/api/dev/debug-session-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {});
  }
}
