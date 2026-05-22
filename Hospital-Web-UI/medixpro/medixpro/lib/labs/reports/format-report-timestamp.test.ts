import { describe, expect, it } from "vitest";
import {
  formatRelativeCollected,
  formatReportTimestamp,
} from "@/lib/labs/reports/format-report-timestamp";

describe("format-report-timestamp", () => {
  it("formatRelativeCollected handles null", () => {
    expect(formatRelativeCollected(null)).toBe("Collected —");
  });

  it("formatReportTimestamp uses fallback for invalid iso", () => {
    expect(formatReportTimestamp("not-a-date", "fallback")).toBe("fallback");
  });
});
