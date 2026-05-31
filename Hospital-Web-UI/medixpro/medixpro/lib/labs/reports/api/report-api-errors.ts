import { ReportApiResponseError } from "@/lib/labs/reports/api/report-api-response";

export type ReportApiErrorCode =
  | "REPORT_LOCKED"
  | "REPORT_NOT_READY"
  | "REPORT_SUPERSEDED"
  | "REPORT_NOT_FOUND"
  | "DUPLICATE_ARTIFACT"
  | "VALIDATION_FAILED"
  | "BRANCH_ACCESS_DENIED"
  | "PERMISSION_DENIED"
  | "ASSIGNMENT_NOT_FOUND"
  | "DELIVERY_LOG_NOT_FOUND"
  | "INVALID_UPLOAD_INTENT"
  | "MULTI_FILE_REUPLOAD_NOT_ALLOWED"
  | "REPORT_OWNERSHIP_MISMATCH"
  | "IDEMPOTENCY_CONFLICT"
  | string;

const OPERATIONAL_COPY: Record<string, string> = {
  REPORT_LOCKED:
    "This report was already finalized and can no longer be modified.",
  REPORT_NOT_READY: "This report is not ready for that action yet. Upload or complete required steps first.",
  REPORT_SUPERSEDED: "This report revision is no longer active. Refresh the queue to see the current version.",
  REPORT_NOT_FOUND: "This report could not be found. It may have been removed.",
  DUPLICATE_ARTIFACT: "This file was already uploaded for this report. Choose a different file or refresh.",
  VALIDATION_FAILED: "Could not complete this action. Check the report and try again.",
  BRANCH_ACCESS_DENIED: "You do not have access to this report for the selected lab branch.",
  PERMISSION_DENIED: "You do not have permission to perform this action.",
  ASSIGNMENT_NOT_FOUND: "This task is no longer on your queue. Refresh to see current work.",
  DELIVERY_LOG_NOT_FOUND: "Delivery record not found. Refresh and try again.",
  INVALID_UPLOAD_INTENT: "Upload intent is invalid. Refresh and try again.",
  MULTI_FILE_REUPLOAD_NOT_ALLOWED: "Re-upload accepts exactly one file.",
  REPORT_OWNERSHIP_MISMATCH: "This report is not linked correctly and cannot be uploaded.",
  IDEMPOTENCY_CONFLICT: "A similar upload is already being processed. Please wait a moment.",
};

export function isOperationalConflictCode(code: string): boolean {
  return (
    code === "REPORT_LOCKED" ||
    code === "REPORT_SUPERSEDED" ||
    code === "REPORT_NOT_READY"
  );
}

export function mapReportApiErrorToMessage(error: unknown): string {
  if (error instanceof ReportApiResponseError) {
    return OPERATIONAL_COPY[error.code] ?? OPERATIONAL_COPY.VALIDATION_FAILED;
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    return OPERATIONAL_COPY[code] ?? OPERATIONAL_COPY.VALIDATION_FAILED;
  }
  return OPERATIONAL_COPY.VALIDATION_FAILED;
}

export function extractReportApiErrorCode(error: unknown): ReportApiErrorCode {
  if (error instanceof ReportApiResponseError) return error.code;
  return "VALIDATION_FAILED";
}

export function extractReportRequestId(error: unknown): string | undefined {
  if (error instanceof ReportApiResponseError && error.requestId) return error.requestId;
  return undefined;
}
