import { describe, expect, it } from "vitest";
import {
  mapActionTargetsDto,
  mapReportDetailDto,
  mapReportTaskDto,
  resolveCorrectReportId,
  resolveTargetReportId,
  resolveUploadReportId,
} from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTaskApiItem } from "@/lib/labs/reports/api/report-api-types";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

const baseTaskDto = (): ReportTaskApiItem => ({
  task_id: "task-1",
  assignment_id: "task-1",
  order_uuid: "order-1",
  order_number: "ORD-HOME-1",
  patient_name: "Patient",
  patient_phone: "9999999999",
  collection_type: "HOME",
  test_label: "CBC",
  operational_status: "PENDING_UPLOAD",
  visit_or_slot_label: "Home",
  pending_sibling_count: 0,
  uploaded_at: null,
  ready_at: null,
  delivered_at: null,
  order_workflow_state: "pending_upload",
  available_action_targets: {
    upload_report_id: null,
    mark_ready_report_id: null,
    correct_report_id: null,
    send_whatsapp_report_id: null,
    retry_delivery_log_id: null,
  },
});

describe("reports-api-mappers", () => {
  it("mapReportTaskDto uses logistics anchors when uploads are absent", () => {
    const collected = "2026-06-04T10:00:00.000Z";
    const assigned = "2026-06-03T08:00:00.000Z";
    const task = mapReportTaskDto({
      ...baseTaskDto(),
      assigned_at: assigned,
      sample_collected_at: collected,
      operational_anchor_at: collected,
    });
    expect(task.updatedAtIso).toBe(collected);
    expect(task.assignedAtIso).toBe(assigned);
    expect(task.collectedAtLabel).toContain("Collected");
  });

  it("mapActionTargetsDto normalizes nulls", () => {
    const targets = mapActionTargetsDto({
      upload_report_id: null,
      mark_ready_report_id: "mr-1",
      correct_report_id: "cr-1",
      send_whatsapp_report_id: null,
      retry_delivery_log_id: "log-1",
    });
    expect(targets.markReadyReportId).toBe("mr-1");
    expect(targets.correctReportId).toBe("cr-1");
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

  it("resolveTargetReportId prefers URL reportId", () => {
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
      operationalStatus: "DELIVERED",
      activeReports: [
        {
          reportId: "r-sent",
          lineId: "l1",
          testLabel: "CBC",
          status: "delivered",
          deliveryStatus: "SENT",
          availableActions: ["CORRECT_REPORT"],
        },
        {
          reportId: "r-other",
          lineId: "l2",
          testLabel: "LFT",
          status: "pending",
          deliveryStatus: "PENDING",
          availableActions: ["UPLOAD_REPORT"],
        },
      ],
    };
    expect(resolveTargetReportId(ctx, "r-sent")).toBe("r-sent");
    expect(resolveTargetReportId(ctx, "missing")).toBe("r-other");
    expect(resolveCorrectReportId(ctx)).toBe("r-sent");
    expect(resolveTargetReportId(ctx, undefined, { mode: "reupload" })).toBe("r-sent");
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
