import { describe, expect, it } from "vitest";
import { groupTasksByPatient } from "@/lib/labs/reports/group-report-tasks";
import { searchReportTasks } from "@/lib/labs/reports/search-report-tasks";
import { buildReportTasksFromOrders, mapOrderToReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";

function order(partial: Partial<LabOrderRow> & { assignmentId: string; patient: string }): LabOrderRow {
  return {
    id: "ORD-100",
    orderUuid: "uuid-1",
    assignmentId: partial.assignmentId,
    patient: partial.patient,
    patientPhone: partial.patientPhone ?? "9876543210",
    patientAge: 30,
    patientGender: "M",
    patientAddress: "",
    doctor: "Dr",
    clinic: "",
    tests: partial.tests ?? [{ name: "CBC", category: "", urgency: "ROUTINE", homeEligible: false }],
    collectionType: partial.collectionType ?? "HOME",
    preferredSlot: "Today 10:00",
    branch: "",
    status: "IN_PROGRESS",
    sampleStatus: null,
    reportStatus: partial.reportStatus ?? "pending",
    homeCollection: partial.collectionType === "HOME",
    allowedActions: [],
    createdAt: "",
    assignedAtIso: "2026-05-18T08:00:00.000Z",
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    urgency: "ROUTINE",
    timeline: [],
  };
}

describe("report-task", () => {
  it("maps order to report task", () => {
    const task = mapOrderToReportTask(order({ assignmentId: "a1", patient: "Rahul K" }));
    expect(task.taskId).toBe("a1");
    expect(task.testLabel).toBe("CBC");
    expect(task.operationalStatus).toBe("PENDING_UPLOAD");
  });

  it("groups tasks by patient", () => {
    const tasks = buildReportTasksFromOrders([
      order({ assignmentId: "a1", patient: "Rahul K", reportStatus: "pending" }),
      order({
        assignmentId: "a2",
        patient: "Rahul K",
        reportStatus: "in_progress",
        tests: [{ name: "Thyroid", category: "", urgency: "ROUTINE", homeEligible: false }],
      }),
      order({ assignmentId: "a3", patient: "Priya S", patientPhone: "9111111111", reportStatus: "pending" }),
    ]);
    const groups = groupTasksByPatient(tasks);
    expect(groups).toHaveLength(2);
    const rahul = groups.find((g) => g.patientName === "Rahul K");
    expect(rahul?.tasks).toHaveLength(2);
    expect(rahul?.pendingCount).toBe(1);
  });

  it("searches by test name", () => {
    const tasks = buildReportTasksFromOrders([
      order({ assignmentId: "a1", patient: "Rahul K" }),
    ]);
    expect(searchReportTasks(tasks, "cbc")).toHaveLength(1);
    expect(searchReportTasks(tasks, "mri")).toHaveLength(0);
  });
});
