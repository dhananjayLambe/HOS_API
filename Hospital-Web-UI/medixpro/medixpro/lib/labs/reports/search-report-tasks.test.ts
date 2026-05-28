import { describe, expect, it } from "vitest";
import { searchReportTasks } from "@/lib/labs/reports/search-report-tasks";
import type { ReportTask } from "@/lib/labs/reports/report-task";

function task(partial: Partial<ReportTask> & Pick<ReportTask, "patientName">): ReportTask {
  return {
    taskId: "t1",
    assignmentId: "a1",
    orderUuid: "o1",
    orderNumber: "ORD-1",
    patientKey: partial.patientName.toLowerCase(),
    patientPhone: "9999999999",
    testLabel: "CBC",
    testNames: ["CBC"],
    collectionType: "VISIT",
    visitOrSlotLabel: "—",
    collectedAtLabel: "—",
    updatedAtLabel: "—",
    updatedAtIso: null,
    assignedAtIso: null,
    createdAtIso: null,
    actionTargets: {},
    operationalStatus: "PENDING_UPLOAD",
    pendingSiblingCount: 0,
    urgency: "ROUTINE",
    tatBreached: false,
    labName: "Lab",
    reportCount: 1,
    ...partial,
  };
}

describe("searchReportTasks", () => {
  it("matches full patient name", () => {
    const tasks = [task({ patientName: "Rahul Kumar" })];
    expect(searchReportTasks(tasks, "Rahul Kumar")).toHaveLength(1);
    expect(searchReportTasks(tasks, "rahul kumar")).toHaveLength(1);
  });

  it("matches each token against first or last name parts", () => {
    const tasks = [task({ patientName: "Rahul Kumar" })];
    expect(searchReportTasks(tasks, "Kumar Rahul")).toHaveLength(1);
  });

  it("matches single token against first name", () => {
    const tasks = [task({ patientName: "Rahul Kumar" })];
    expect(searchReportTasks(tasks, "Rahul")).toHaveLength(1);
    expect(searchReportTasks(tasks, "Kumar")).toHaveLength(1);
  });
});
