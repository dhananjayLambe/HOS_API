/** v1 diagnostics operational API envelope. */

export type DiagnosticsApiEnvelope<T> = {
  success: boolean;
  request_id: string;
  data: T;
  error?: { code: string; message: string };
};

export class ReportApiResponseError extends Error {
  readonly code: string;
  readonly requestId: string;

  constructor(message: string, code: string, requestId: string) {
    super(message);
    this.name = "ReportApiResponseError";
    this.code = code;
    this.requestId = requestId;
  }
}

export function unwrapApiResponse<T>(payload: DiagnosticsApiEnvelope<T>): T {
  if (!payload.success) {
    const code = payload.error?.code ?? "VALIDATION_FAILED";
    const message = payload.error?.message ?? "Request failed.";
    throw new ReportApiResponseError(message, code, payload.request_id ?? "");
  }
  return payload.data;
}

export function newReportRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
