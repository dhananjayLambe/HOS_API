import { describe, expect, it } from "vitest";
import { adaptReportTaskContext } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

const sample: ReportTaskContext = {
  taskId: "t-1",
  assignmentId: "a-1",
  orderUuid: "o-1",
  orderNumber: "1001",
  patientName: "Jane Doe",
  patientPhone: "+911234567890",
  encounterId: null,
  collectionType: "HOME",
  visitOrSlotLabel: "Morning slot",
  operationalStatus: "PENDING_UPLOAD",
  activeReports: [
    {
      reportId: "r1",
      lineId: "l1",
      testLabel: "CBC",
      status: "UPLOADED",
      deliveryStatus: "PENDING",
      availableActions: [],
    },
  ],
};

describe("upload-task-context-adapter", () => {
  it("maps context to upload view model", () => {
    const adapted = adaptReportTaskContext(sample, { pendingSiblingCount: 2 });
    expect(adapted.patientName).toBe("Jane Doe");
    expect(adapted.testLabelSummary).toBe("CBC");
    expect(adapted.uploadTestLabel).toBe("CBC");
    expect(adapted.reportLines).toHaveLength(1);
    expect(adapted.uploadProgress.total).toBe(1);
    expect(adapted.pendingSiblingCount).toBe(2);
    expect(adapted.historicalReports).toHaveLength(1);
    expect(adapted.historicalReports[0]?.reportId).toBe("r1");
  });

  it("resolves uploadTestLabel from upload_target line", () => {
    const adapted = adaptReportTaskContext({
      ...sample,
      activeReports: [
        {
          reportId: "r1",
          lineId: "l1",
          testLabel: "CBC",
          status: "pending",
          deliveryStatus: "PENDING",
          availableActions: ["UPLOAD_REPORT"],
        },
        {
          reportId: "r2",
          lineId: "l2",
          testLabel: "LFT",
          status: "pending",
          deliveryStatus: "PENDING",
          availableActions: ["UPLOAD_REPORT"],
        },
      ],
      uploadTarget: {
        reportId: "r2",
        lineId: "l2",
        operationalStatus: "PENDING_UPLOAD",
      },
    });
    expect(adapted.uploadTestLabel).toBe("LFT");
    expect(adapted.testLabelSummary).toBe("CBC, LFT");
  });
});
