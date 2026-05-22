import { describe, expect, it } from "vitest";
import { filterReportTasks } from "@/lib/labs/reports/filter-report-tasks";
import { emptyActionTargets, type ReportTask } from "@/lib/labs/reports/report-task";

function task(partial: Partial<ReportTask>): ReportTask {
  return {
    taskId: "t1",
    assignmentId: "t1",
    orderUuid: "o1",
    orderNumber: "ORD-1",
    patientKey: "p1",
    patientName: "Test",
    patientPhone: "",
    testLabel: "CBC",
    testNames: ["CBC"],
    collectionType: "HOME",
    visitOrSlotLabel: "—",
    collectedAtLabel: "",
    updatedAtLabel: "",
    assignedAtIso: null,
    createdAtIso: null,
    operationalStatus: "PENDING_UPLOAD",
    pendingSiblingCount: 0,
    urgency: "ROUTINE",
    tatBreached: false,
    labName: "Main Lab",
    reportCount: 1,
    actionTargets: emptyActionTargets(),
    ...partial,
  };
}

describe("filterReportTasks", () => {
  const tasks = [
    task({ taskId: "1", urgency: "URGENT", tatBreached: true, collectionType: "HOME" }),
    task({ taskId: "2", urgency: "ROUTINE", operationalStatus: "UPLOADED", collectionType: "VISIT" }),
  ];

  it("filters urgent only", () => {
    expect(filterReportTasks(tasks, { urgentOnly: true })).toHaveLength(1);
    expect(filterReportTasks(tasks, { urgentOnly: true })[0]?.taskId).toBe("1");
  });

  it("filters tat breached", () => {
    expect(filterReportTasks(tasks, { tatBreached: true })).toHaveLength(1);
  });

  it("filters collection type", () => {
    expect(filterReportTasks(tasks, { collectionType: "VISIT" })).toHaveLength(1);
    expect(filterReportTasks(tasks, { collectionType: "VISIT" })[0]?.taskId).toBe("2");
  });
});
