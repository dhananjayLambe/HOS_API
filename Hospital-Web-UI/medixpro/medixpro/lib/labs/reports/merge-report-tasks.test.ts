import { describe, expect, it } from "vitest";
import { mergeReportTasks } from "@/lib/labs/reports/merge-report-tasks";
import { emptyActionTargets, type ReportTask } from "@/lib/labs/reports/report-task";

function task(id: string): ReportTask {
  return {
    taskId: id,
    assignmentId: id,
    orderUuid: "o",
    orderNumber: "ORD",
    patientKey: "p",
    patientName: "P",
    patientPhone: "",
    testLabel: "T",
    testNames: ["T"],
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
    labName: "",
    reportCount: 1,
    actionTargets: emptyActionTargets(),
  };
}

describe("mergeReportTasks", () => {
  it("keeps live tasks and adds demo-only ids", () => {
    const merged = mergeReportTasks([task("live-1")], [task("demo-1")]);
    expect(merged).toHaveLength(2);
    expect(merged.map((t) => t.taskId).sort()).toEqual(["demo-1", "live-1"]);
  });

  it("live wins on duplicate id", () => {
    const live = { ...task("same"), patientName: "Live" };
    const demo = { ...task("same"), patientName: "Demo" };
    const merged = mergeReportTasks([live], [demo]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.patientName).toBe("Live");
  });
});
