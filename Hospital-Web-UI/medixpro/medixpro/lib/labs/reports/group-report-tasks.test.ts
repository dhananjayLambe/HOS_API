import { describe, expect, it } from "vitest";
import {
  groupTasksByPatient,
  sortWorkflowGroups,
  type PatientReportGroup,
} from "@/lib/labs/reports/group-report-tasks";
import type { ReportTask } from "@/lib/labs/reports/report-task";

function task(partial: Partial<ReportTask> & { taskId: string; patientName: string; operationalStatus: ReportTask["operationalStatus"] }): ReportTask {
  return {
    taskId: partial.taskId,
    orderId: partial.orderId ?? partial.taskId,
    orderNumber: partial.orderNumber ?? "ORD-1",
    patientKey: partial.patientKey ?? partial.patientName,
    patientName: partial.patientName,
    patientPhone: partial.patientPhone ?? "",
    testLabel: partial.testLabel ?? "CBC",
    collectionType: partial.collectionType ?? "HOME",
    operationalStatus: partial.operationalStatus,
    collectedAtLabel: "2h ago",
    updatedAtLabel: "1h ago",
    orderRow: partial.orderRow as ReportTask["orderRow"],
  } as ReportTask;
}

describe("group-report-tasks", () => {
  it("builds progress label from uploaded statuses", () => {
    const groups = groupTasksByPatient([
      task({ taskId: "1", patientName: "Rahul K", operationalStatus: "PENDING_UPLOAD" }),
      task({ taskId: "2", patientName: "Rahul K", operationalStatus: "UPLOADED" }),
      task({ taskId: "3", patientName: "Rahul K", operationalStatus: "DELIVERED" }),
    ]);
    expect(groups[0]?.progressLabel).toBe("2 of 3 reports uploaded");
    expect(groups[0]?.uploadedCount).toBe(2);
    expect(groups[0]?.completedCount).toBe(1);
  });

  it("counts completed (delivered) tasks per patient", () => {
    const groups = groupTasksByPatient([
      task({ taskId: "1", patientName: "Anita Sharma", operationalStatus: "DELIVERED" }),
      task({ taskId: "2", patientName: "Anita Sharma", operationalStatus: "PENDING_UPLOAD" }),
    ]);
    expect(groups[0]?.completedCount).toBe(1);
    expect(groups[0]?.pendingCount).toBe(1);
  });

  it("sorts groups by operational severity then name", () => {
    const pending: PatientReportGroup = {
      patientKey: "z",
      patientName: "Zara",
      patientPhone: "",
      tasks: [task({ taskId: "z1", patientName: "Zara", operationalStatus: "PENDING_UPLOAD" })],
      pendingCount: 1,
      completedCount: 0,
      totalCount: 1,
      uploadedCount: 0,
      progressLabel: "0 of 1 reports uploaded",
      severityScore: 1,
    };
    const failed: PatientReportGroup = {
      patientKey: "a",
      patientName: "Anita",
      patientPhone: "",
      tasks: [task({ taskId: "a1", patientName: "Anita", operationalStatus: "FAILED_DELIVERY" })],
      pendingCount: 0,
      completedCount: 0,
      totalCount: 1,
      uploadedCount: 0,
      progressLabel: "0 of 1 reports uploaded",
      severityScore: 2,
    };
    const delivered: PatientReportGroup = {
      patientKey: "b",
      patientName: "Bob",
      patientPhone: "",
      tasks: [task({ taskId: "b1", patientName: "Bob", operationalStatus: "DELIVERED" })],
      pendingCount: 0,
      completedCount: 1,
      totalCount: 1,
      uploadedCount: 1,
      progressLabel: "1 of 1 reports uploaded",
      severityScore: 5,
    };

    const sorted = sortWorkflowGroups([delivered, failed, pending]);
    expect(sorted.map((g) => g.patientName)).toEqual(["Zara", "Anita", "Bob"]);
  });
});
