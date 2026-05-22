import { describe, expect, it } from "vitest";
import {
  mapActionTargetsDto,
  mapReportDetailDto,
  resolveUploadReportId,
} from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

describe("reports-api-mappers", () => {
  it("mapActionTargetsDto normalizes nulls", () => {
    const targets = mapActionTargetsDto({
      upload_report_id: null,
      mark_ready_report_id: "mr-1",
      send_whatsapp_report_id: null,
      retry_delivery_log_id: "log-1",
    });
    expect(targets.markReadyReportId).toBe("mr-1");
    expect(targets.retryDeliveryLogId).toBe("log-1");
    expect(targets.uploadReportId).toBeUndefined();
  });

  it("resolveUploadReportId prefers UPLOAD_REPORT line", () => {
    const ctx: ReportTaskContext = {
      taskId: "t1",
      assignmentId: "t1",
      orderUuid: "o1",
      orderNumber: "ORD-1",
      patientName: "P",
      patientPhone: "",
      encounterId: null,
      collectionType: "HOME",
      visitOrSlotLabel: "—",
      operationalStatus: "PENDING_UPLOAD",
      activeReports: [
        {
          reportId: "r-ready",
          lineId: "l1",
          testLabel: "CBC",
          status: "in_progress",
          deliveryStatus: "PENDING",
          availableActions: ["MARK_READY"],
        },
        {
          reportId: "r-upload",
          lineId: "l2",
          testLabel: "LFT",
          status: "pending",
          deliveryStatus: "PENDING",
          availableActions: ["UPLOAD_REPORT"],
        },
      ],
    };
    expect(resolveUploadReportId(ctx)).toBe("r-upload");
  });

  it("mapReportDetailDto maps nested fields", () => {
    const detail = mapReportDetailDto({
      report: {
        id: "rid",
        status: "ready",
        delivery_status: "PENDING",
        revision_number: 1,
        ready_at: null,
        delivered_at: null,
      },
      patient: { name: "A", phone: "9", encounter_id: null },
      artifacts: [],
      delivery: null,
      history: { supersedes_id: null, superseded_by_id: null },
      available_actions: ["VIEW_REPORT"],
    });
    expect(detail.reportId).toBe("rid");
    expect(detail.availableActions).toContain("VIEW_REPORT");
  });
});
