import { describe, expect, it } from "vitest";
import {
  collectionSuccessPercent,
  filterReportPendingUploadOrders,
  filterReportReadyOrders,
  isReportPendingUpload,
  isReportReadyForDelivery,
} from "@/lib/labs/dashboard/report-pipeline";
import type { LabOrderRow } from "@/lib/labs/types";

function order(reportStatus: string | null): LabOrderRow {
  return {
    assignmentId: "a1",
    orderUuid: "o1",
    id: "ORD-1",
    patient: "Test",
    patientPhone: "",
    patientAge: 0,
    patientGender: "",
    patientAddress: "",
    doctor: "",
    clinic: "",
    tests: [{ name: "CBC", category: "", urgency: "ROUTINE", homeEligible: false }],
    collectionType: "VISIT",
    preferredSlot: "",
    branch: "",
    status: "IN_PROGRESS",
    sampleStatus: null,
    reportStatus,
    homeCollection: false,
    allowedActions: [],
    createdAt: "",
    assignedAtIso: null,
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    urgency: "ROUTINE",
    timeline: [],
  };
}

describe("report-pipeline", () => {
  it("classifies pending upload statuses", () => {
    expect(isReportPendingUpload(null)).toBe(true);
    expect(isReportPendingUpload("pending")).toBe(true);
    expect(isReportPendingUpload("in_progress")).toBe(true);
    expect(isReportReadyForDelivery("ready")).toBe(true);
    expect(isReportReadyForDelivery("delivered")).toBe(false);
  });

  it("filters order rows", () => {
    const rows = [order(null), order("ready"), order("pending")];
    expect(filterReportPendingUploadOrders(rows)).toHaveLength(2);
    expect(filterReportReadyOrders(rows)).toHaveLength(1);
  });

  it("computes collection success percent", () => {
    expect(collectionSuccessPercent(8, 2)).toBe(80);
    expect(collectionSuccessPercent(0, 0)).toBeNull();
  });
});
