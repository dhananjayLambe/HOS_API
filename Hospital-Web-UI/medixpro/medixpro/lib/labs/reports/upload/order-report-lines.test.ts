import { describe, expect, it } from "vitest";
import {
  buildOrderReportLines,
  computeOrderUploadProgress,
} from "@/lib/labs/reports/upload/order-report-lines";
import type { ReportLineContext } from "@/lib/labs/reports/report-task-context";

function line(partial: Partial<ReportLineContext> & Pick<ReportLineContext, "reportId" | "testLabel">): ReportLineContext {
  return {
    lineId: partial.lineId ?? `line-${partial.reportId}`,
    status: partial.status ?? "pending",
    deliveryStatus: partial.deliveryStatus ?? "PENDING",
    availableActions: partial.availableActions ?? ["UPLOAD_REPORT"],
    ...partial,
  };
}

describe("order-report-lines", () => {
  it("marks pending lines as needs upload", () => {
    const rows = buildOrderReportLines([
      line({ reportId: "r1", testLabel: "CBC", status: "pending" }),
      line({ reportId: "r2", testLabel: "LFT", status: "in_progress", availableActions: ["MARK_READY"] }),
    ]);
    expect(rows[0]?.needsUpload).toBe(true);
    expect(rows[1]?.needsUpload).toBe(false);
    expect(rows[1]?.operationalStatus).toBe("UPLOADED");
  });

  it("highlights current upload target", () => {
    const rows = buildOrderReportLines(
      [
        line({ reportId: "r1", testLabel: "CBC", lineId: "l1" }),
        line({ reportId: "r2", testLabel: "LFT", lineId: "l2" }),
      ],
      { reportId: "r2", lineId: "l2" },
    );
    expect(rows.find((r) => r.testLabel === "LFT")?.isCurrentUploadTarget).toBe(true);
  });

  it("summarizes missing uploads on multi-test orders", () => {
    const progress = computeOrderUploadProgress(
      buildOrderReportLines([
        line({ reportId: "r1", testLabel: "CBC", status: "ready", availableActions: [] }),
        line({ reportId: "r2", testLabel: "LFT", status: "pending" }),
      ]),
    );
    expect(progress.pendingUploadCount).toBe(1);
    expect(progress.pendingUploadLabels).toEqual(["LFT"]);
    expect(progress.isAllReportsUploaded).toBe(false);
    expect(progress.summary).toContain("LFT");
  });

  it("detects order ready for delivery", () => {
    const progress = computeOrderUploadProgress(
      buildOrderReportLines([
        line({ reportId: "r1", testLabel: "CBC", status: "ready", availableActions: [] }),
        line({ reportId: "r2", testLabel: "LFT", status: "ready", availableActions: [] }),
      ]),
    );
    expect(progress.isOrderReadyForDelivery).toBe(true);
    expect(progress.isOrderComplete).toBe(false);
  });
});
