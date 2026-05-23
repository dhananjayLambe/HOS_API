import { describe, expect, it } from "vitest";
import {
  mergeOrderReportWorkflowStatus,
  mergeOrderWorkflowForReportDrawer,
} from "@/lib/labs/reports/merge-order-report-workflow-status";
import type { ReportDetail } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";

const baseOrder: LabOrderRow = {
  id: "ORD-1",
  assignmentId: "a1",
  orderUuid: "o1",
  patient: "Pat",
  patientPhone: "1",
  patientAge: 30,
  patientGender: "M",
  patientAddress: "",
  doctor: "Dr",
  clinic: "",
  tests: [],
  collectionType: "VISIT",
  preferredSlot: "—",
  branch: "Main",
  status: "ACCEPTED",
  sampleStatus: "COLLECTED",
  reportStatus: "IN_PROGRESS",
  homeCollection: false,
  allowedActions: [],
  createdAt: "",
  assignedAtIso: null,
  timeline: [],
};

describe("mergeOrderReportWorkflowStatus", () => {
  it("overrides reportStatus when detail is present", () => {
    const detail = { status: "READY" } as ReportDetail;
    const merged = mergeOrderReportWorkflowStatus(baseOrder, detail);
    expect(merged.reportStatus).toBe("READY");
    expect(merged.sampleStatus).toBe("COLLECTED");
  });

  it("returns order unchanged when detail has no status", () => {
    expect(mergeOrderReportWorkflowStatus(baseOrder, undefined)).toBe(baseOrder);
  });
});

describe("mergeOrderWorkflowForReportDrawer", () => {
  const task = { taskId: "t1" } as ReportTask;

  it("infers COLLECTED for sample when API sample_status is null", () => {
    const merged = mergeOrderWorkflowForReportDrawer(baseOrder, { task });
    expect(merged.sampleStatus).toBe("COLLECTED");
  });

  it("keeps API sample_status when present", () => {
    const merged = mergeOrderWorkflowForReportDrawer(
      { ...baseOrder, sampleStatus: "RECEIVED" },
      { task },
    );
    expect(merged.sampleStatus).toBe("RECEIVED");
  });
});
