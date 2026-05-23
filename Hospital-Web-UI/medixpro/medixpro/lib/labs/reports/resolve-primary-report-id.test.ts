import { describe, expect, it } from "vitest";
import { resolvePrimaryReportId } from "@/lib/labs/reports/resolve-primary-report-id";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

function ctx(partial: Partial<ReportTaskContext>): ReportTaskContext {
  return {
    taskId: "t1",
    assignmentId: "a1",
    orderUuid: "o1",
    orderNumber: "ORD-1",
    patientName: "P",
    patientPhone: "9",
    encounterId: null,
    collectionType: "VISIT",
    visitOrSlotLabel: "—",
    operationalStatus: "PENDING_UPLOAD",
    activeReports: [],
    ...partial,
  };
}

describe("resolvePrimaryReportId", () => {
  it("prefers upload_target from context", () => {
    const id = resolvePrimaryReportId(
      ctx({
        uploadTarget: { reportId: "upload-target-id", lineId: "l1", operationalStatus: "PENDING_UPLOAD" },
        activeReports: [{ reportId: "other", lineId: "l2", testLabel: "T", status: "pending", deliveryStatus: "pending", availableActions: [] }],
      }),
    );
    expect(id).toBe("upload-target-id");
  });

  it("falls back to first line with UPLOAD_REPORT action", () => {
    const id = resolvePrimaryReportId(
      ctx({
        activeReports: [
          { reportId: "r1", lineId: "l1", testLabel: "A", status: "pending", deliveryStatus: "pending", availableActions: ["MARK_READY"] },
          { reportId: "r2", lineId: "l2", testLabel: "B", status: "pending", deliveryStatus: "pending", availableActions: ["UPLOAD_REPORT"] },
        ],
      }),
    );
    expect(id).toBe("r2");
  });
});
