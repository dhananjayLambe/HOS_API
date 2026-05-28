import { describe, expect, it } from "vitest";
import { fallbackOrderFromTask } from "@/lib/labs/reports/completion/fallback-order-from-task";
import { buildOrderLifecycleFromTaskContext } from "@/lib/labs/reports/completion/report-lifecycle-adapter";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

const ORDER_KEYS: (keyof OrderLifecycleViewModel)[] = [
  "taskId",
  "orderNumber",
  "patientKey",
  "patientName",
  "patientPhone",
  "tatState",
  "tatLabel",
  "urgency",
  "reports",
  "nextAction",
  "lastActivity",
  "attentionReasons",
  "isFullyComplete",
  "readyToSendCount",
  "hasPendingUpload",
];

function assertOrderShape(order: OrderLifecycleViewModel) {
  for (const key of ORDER_KEYS) {
    expect(order).toHaveProperty(key);
  }
  expect(Array.isArray(order.reports)).toBe(true);
  if (order.reports.length > 0) {
    const chip = order.reports[0]!;
    expect(chip).toHaveProperty("reportId");
    expect(chip).toHaveProperty("testLabel");
    expect(chip).toHaveProperty("status");
    expect(chip).toHaveProperty("deliveryState");
    expect(chip).toHaveProperty("artifacts");
    expect(chip).toHaveProperty("availableActions");
    expect(chip.availableActions.length).toBeGreaterThan(0);
  }
}

const stubTask: ReportTask = {
  taskId: "task-1",
  assignmentId: "asg-1",
  orderUuid: "ord-1",
  orderNumber: "ORD-100",
  patientKey: "phone:9999999999",
  patientName: "Test Patient",
  patientPhone: "+919999999999",
  testLabel: "CBC",
  testNames: ["CBC"],
  collectionType: "HOME",
  visitOrSlotLabel: "Today",
  collectedAtLabel: "2h ago",
  updatedAtLabel: "1h ago",
  updatedAtIso: null,
  assignedAtIso: null,
  createdAtIso: null,
  operationalStatus: "PENDING_UPLOAD",
  pendingSiblingCount: 0,
  urgency: "ROUTINE",
  tatBreached: false,
  labName: "Lab",
  reportCount: 1,
  actionTargets: {
    uploadReportId: "report-1",
  },
};

const stubContext: ReportTaskContext = {
  taskId: "task-1",
  assignmentId: "asg-1",
  orderUuid: "ord-1",
  orderNumber: "ORD-100",
  patientName: "Test Patient",
  patientPhone: "+919999999999",
  encounterId: null,
  collectionType: "HOME",
  visitOrSlotLabel: "Today",
  operationalStatus: "PENDING_UPLOAD",
  activeReports: [
    {
      reportId: "report-1",
      lineId: "line-1",
      testLabel: "CBC",
      status: "pending",
      deliveryStatus: "pending",
      availableActions: ["UPLOAD_REPORT"],
    },
  ],
  uploadTarget: { reportId: "report-1", lineId: "line-1", operationalStatus: "PENDING_UPLOAD" },
};

describe("OrderLifecycleViewModel contract", () => {
  it("fallbackOrderFromTask matches stable shape", () => {
    assertOrderShape(fallbackOrderFromTask(stubTask));
  });

  it("buildOrderLifecycleFromTaskContext matches same top-level shape as fallback", () => {
    const fromContext = buildOrderLifecycleFromTaskContext(stubContext);
    const fromFallback = fallbackOrderFromTask(stubTask);
    assertOrderShape(fromContext);
    for (const key of ORDER_KEYS) {
      expect(fromContext).toHaveProperty(key);
      expect(fromFallback).toHaveProperty(key);
    }
    expect(fromContext.reports.length).toBe(fromFallback.reports.length);
  });
});
