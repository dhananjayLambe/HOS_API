import { describe, expect, it } from "vitest";
import type { ReportTaskApiItem } from "@/lib/labs/api/report-tasks-types";
import { mapReportTaskDtoToReportTask } from "@/lib/labs/reports/map-report-task-dto";

function dto(partial: Partial<ReportTaskApiItem>): ReportTaskApiItem {
  return {
    task_id: "task-1",
    assignment_id: "task-1",
    order_uuid: "order-uuid",
    order_number: "DX260001",
    patient_name: "Rahul Kumar",
    patient_phone: "9876500001",
    collection_type: "HOME",
    test_label: "CBC + LFT",
    operational_status: "PENDING_UPLOAD",
    visit_or_slot_label: "Today 10:00",
    pending_sibling_count: 2,
    uploaded_at: null,
    ready_at: null,
    delivered_at: null,
    available_action_targets: {
      upload_report_id: "report-uuid-1",
      mark_ready_report_id: null,
      correct_report_id: null,
      send_whatsapp_report_id: null,
      retry_delivery_log_id: null,
    },
    ...partial,
  };
}

describe("mapReportTaskDtoToReportTask", () => {
  it("maps operational_status buckets via choke point", () => {
    const task = mapReportTaskDtoToReportTask(dto({ operational_status: "READY_DELIVERY" }));
    expect(task.operationalStatus).toBe("READY_DELIVERY");
  });

  it("maps patient and test fields", () => {
    const task = mapReportTaskDtoToReportTask(dto({}));
    expect(task.patientName).toBe("Rahul Kumar");
    expect(task.testLabel).toBe("CBC + LFT");
    expect(task.pendingSiblingCount).toBe(2);
    expect(task.collectionType).toBe("HOME");
  });

  it("parses multi-test label", () => {
    const task = mapReportTaskDtoToReportTask(dto({ test_label: "CBC + Thyroid + 2 more" }));
    expect(task.testNames.length).toBeGreaterThan(0);
  });

  it("maps available_action_targets to actionTargets", () => {
    const task = mapReportTaskDtoToReportTask(
      dto({
        available_action_targets: {
          upload_report_id: null,
          mark_ready_report_id: "ready-report-id",
          correct_report_id: "correct-report-id",
          send_whatsapp_report_id: "wa-report-id",
          retry_delivery_log_id: "log-id",
        },
      }),
    );
    expect(task.actionTargets.uploadReportId).toBeUndefined();
    expect(task.actionTargets.markReadyReportId).toBe("ready-report-id");
    expect(task.actionTargets.correctReportId).toBe("correct-report-id");
    expect(task.actionTargets.sendWhatsappReportId).toBe("wa-report-id");
    expect(task.actionTargets.retryDeliveryLogId).toBe("log-id");
  });
});
