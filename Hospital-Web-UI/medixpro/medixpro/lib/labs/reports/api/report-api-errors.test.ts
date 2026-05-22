import { describe, expect, it } from "vitest";
import { ReportApiResponseError } from "@/lib/labs/reports/api/report-api-response";
import {
  isOperationalConflictCode,
  mapReportApiErrorToMessage,
} from "@/lib/labs/reports/api/report-api-errors";

describe("report-api-errors", () => {
  it("maps REPORT_LOCKED to operational copy", () => {
    const err = new ReportApiResponseError("locked", "REPORT_LOCKED", "req-1");
    expect(mapReportApiErrorToMessage(err)).toContain("finalized");
  });

  it("detects operational conflict codes", () => {
    expect(isOperationalConflictCode("REPORT_SUPERSEDED")).toBe(true);
    expect(isOperationalConflictCode("DUPLICATE_ARTIFACT")).toBe(false);
  });
});
