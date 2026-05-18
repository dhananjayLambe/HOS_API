import { describe, expect, it } from "vitest";
import { canOpenInBrowserTab, isSpreadsheetFile } from "@/lib/labs/reports/parse-spreadsheet-preview";

describe("parse-spreadsheet-preview helpers", () => {
  it("detects xlsx as spreadsheet", () => {
    expect(isSpreadsheetFile("report.xlsx", "")).toBe(true);
    expect(
      isSpreadsheetFile(
        "report.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
  });

  it("does not open xlsx in browser tab", () => {
    expect(
      canOpenInBrowserTab(
        "report.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(false);
  });

  it("allows pdf in browser tab", () => {
    expect(canOpenInBrowserTab("report.pdf", "application/pdf")).toBe(true);
  });
});
