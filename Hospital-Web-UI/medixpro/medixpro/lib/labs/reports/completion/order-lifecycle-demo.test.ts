import {
  ORDER_LIFECYCLE_DEMO_ORDERS,
  filterOrdersByChip,
  groupOrdersByPatient,
  orderPriorityScore,
  searchOrders,
} from "@/lib/labs/reports/completion/order-lifecycle-demo";
import { buildTestWorkflows } from "@/lib/labs/reports/completion/operational-contract";
import { recomputeOrderDerived } from "@/lib/labs/reports/completion/next-action-engine";
import type { OrderLifecycleViewModel, ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { describe, expect, it } from "vitest";

function chip(
  reportId: string,
  testLabel: string,
  status: ReportChipViewModel["status"],
): ReportChipViewModel {
  return {
    reportId,
    testLabel,
    status,
    deliveryState: status === "sent" ? "sent" : status === "failed" ? "failed" : "not_sent",
    artifacts: [],
    versions: [],
  };
}

function order(
  partial: Partial<OrderLifecycleViewModel> & Pick<OrderLifecycleViewModel, "taskId" | "reports">,
): OrderLifecycleViewModel {
  const { taskId, reports, ...rest } = partial;
  return recomputeOrderDerived({
    taskId,
    orderNumber: "DX1",
    patientKey: "p1",
    patientName: "Test Patient",
    patientPhone: "9876500000",
    tatState: "safe",
    tatLabel: "TAT: 1h left",
    urgency: "ROUTINE",
    reports,
    nextAction: { line: "", showSendAvailable: false, showUpload: false, readyReportIds: [] },
    lastActivity: { atLabel: "1m ago", byName: "Priya" },
    attentionReasons: [],
    isFullyComplete: false,
    readyToSendCount: 0,
    hasPendingUpload: false,
    ...rest,
  });
}

describe("order lifecycle filters", () => {
  const orders = [
    order({
      taskId: "a",
      patientName: "Rahul Sharma",
      patientPhone: "9876500001",
      orderNumber: "DX2045",
      reports: [chip("1", "CBC", "pending")],
    }),
    order({
      taskId: "b",
      patientName: "Priya Patil",
      reports: [chip("2", "MRI", "ready")],
    }),
    order({
      taskId: "c",
      patientName: "Delivered Patient",
      reports: [chip("3", "CBC", "sent")],
    }),
  ];

  it("search matches patient name and order number", () => {
    expect(searchOrders(orders, "rahul")).toHaveLength(1);
    expect(searchOrders(orders, "DX2045")).toHaveLength(1);
    expect(searchOrders(orders, "9876500001")).toHaveLength(1);
  });

  it("pending filter includes orders with pending uploads", () => {
    expect(filterOrdersByChip(orders, "pending")).toHaveLength(1);
  });

  it("ready filter includes orders with sendable reports", () => {
    expect(filterOrdersByChip(orders, "ready")).toHaveLength(1);
  });

  it("delivered filter includes completed orders", () => {
    expect(filterOrdersByChip(orders, "delivered")).toHaveLength(1);
  });

  it("keeps multiple orders under one patient group", () => {
    const grouped = groupOrdersByPatient([
      order({
        taskId: "p1-a",
        patientKey: "phone:111",
        patientName: "Rahul Sharma",
        reports: [chip("1", "CBC", "pending")],
      }),
      order({
        taskId: "p1-b",
        patientKey: "phone:111",
        patientName: "Rahul Sharma",
        reports: [chip("2", "Lipid", "ready")],
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.patientName).toBe("Rahul Sharma");
    expect(grouped[0]!.orders).toHaveLength(2);
  });

  it("sorts orders inside a patient group by operational urgency", () => {
    const grouped = groupOrdersByPatient([
      order({
        taskId: "ready",
        patientKey: "phone:222",
        patientName: "Priya Patil",
        reports: [chip("1", "Thyroid", "ready")],
      }),
      order({
        taskId: "failed",
        patientKey: "phone:222",
        patientName: "Priya Patil",
        reports: [chip("2", "CBC", "failed")],
        deliveryFailure: {
          reportId: "2",
          testLabel: "CBC",
          reason: "Invalid mobile number",
          phone: "9876500000",
        },
      }),
      order({
        taskId: "pending",
        patientKey: "phone:222",
        patientName: "Priya Patil",
        reports: [chip("3", "ABPM", "pending")],
      }),
    ]);

    expect(grouped[0]!.orders.map((o) => o.taskId)).toEqual(["failed", "pending", "ready"]);
  });

  it("scores failed work ahead of normal pending and ready orders", () => {
    const failed = order({
      taskId: "failed-score",
      reports: [chip("1", "CBC", "failed")],
    });
    const pending = order({
      taskId: "pending-score",
      reports: [chip("2", "ABPM", "pending")],
    });
    const ready = order({
      taskId: "ready-score",
      reports: [chip("3", "Lipid", "ready")],
    });

    expect(orderPriorityScore(failed)).toBeLessThan(orderPriorityScore(pending));
    expect(orderPriorityScore(pending)).toBeLessThan(orderPriorityScore(ready));
  });

  it("demo data renders all allowed Phase 1 report states", () => {
    const workflows = ORDER_LIFECYCLE_DEMO_ORDERS.flatMap((demoOrder) => buildTestWorkflows(demoOrder.reports));

    expect(workflows.some((workflow) => workflow.uploadState === "PENDING")).toBe(true);
    expect(workflows.some((workflow) => workflow.deliveryState === "READY" && !workflow.isReuploaded)).toBe(true);
    expect(workflows.some((workflow) => workflow.deliveryState === "SENT" && !workflow.isReuploaded)).toBe(true);
    expect(workflows.some((workflow) => workflow.deliveryState === "FAILED")).toBe(true);
    expect(workflows.some((workflow) => workflow.isReuploaded && workflow.deliveryState === "READY")).toBe(true);
    expect(workflows.some((workflow) => workflow.isReuploaded && workflow.deliveryState === "SENT")).toBe(true);
  });

  it("keeps re-upload mock data scoped to one test in a multi-test order", () => {
    const order = ORDER_LIFECYCLE_DEMO_ORDERS.find((demoOrder) => demoOrder.orderNumber === "DX2045");
    expect(order).toBeDefined();
    expect(order!.reports.filter((report) => report.isReuploaded)).toHaveLength(1);
    expect(order!.reports.some((report) => report.status === "pending")).toBe(true);
    expect(order!.reports.some((report) => report.status === "ready")).toBe(true);
    expect(order!.reports.some((report) => report.status === "sent" && !report.isReuploaded)).toBe(true);
  });

  it("keeps removed Phase 1 flows out of demo copy", () => {
    const serialized = JSON.stringify(ORDER_LIFECYCLE_DEMO_ORDERS).toLowerCase();
    expect(serialized).not.toMatch(/rejected|approval|manual delivery|device|recollection|revoke|archived|superseded|corrected/);
  });
});
