import { describe, expect, it } from "vitest";
import {
  computeCompletionKpis,
  filterOrdersByWorkflow,
  orderPriorityScore,
  sortOrdersByOperationalPriority,
} from "@/lib/labs/reports/completion/order-lifecycle-queue-utils";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";

function order(partial: Partial<OrderLifecycleViewModel>): OrderLifecycleViewModel {
  return {
    taskId: partial.taskId ?? "t",
    orderNumber: partial.orderNumber ?? "ORD",
    patientKey: "k",
    patientName: "P",
    patientPhone: "1",
    tatState: partial.tatState ?? "safe",
    tatLabel: "TAT",
    urgency: partial.urgency ?? "ROUTINE",
    reports: partial.reports ?? [],
    nextAction: {
      line: "",
      showSendAvailable: false,
      showUpload: false,
      readyReportIds: [],
    },
    lastActivity: { atLabel: "now", byName: "System" },
    attentionReasons: partial.attentionReasons ?? [],
    isFullyComplete: partial.isFullyComplete ?? false,
    readyToSendCount: partial.readyToSendCount ?? 0,
    hasPendingUpload: partial.hasPendingUpload ?? false,
    deliveryFailure: partial.deliveryFailure,
    tatBreached: partial.tatBreached,
  };
}

describe("orderPriorityScore", () => {
  it("ranks failed before pending before ready before delivered", () => {
    const failed = order({ taskId: "f", deliveryFailure: { reportId: "r", testLabel: "T", reason: "x", phone: "1" } });
    const pending = order({ taskId: "p", hasPendingUpload: true });
    const ready = order({ taskId: "r", readyToSendCount: 1 });
    const delivered = order({ taskId: "d", isFullyComplete: true });

    expect(orderPriorityScore(failed)).toBeLessThan(orderPriorityScore(pending));
    expect(orderPriorityScore(pending)).toBeLessThan(orderPriorityScore(ready));
    expect(orderPriorityScore(ready)).toBeLessThan(orderPriorityScore(delivered));
  });
});

describe("sortOrdersByOperationalPriority", () => {
  it("sorts by operational priority not order number only", () => {
    const sorted = sortOrdersByOperationalPriority([
      order({ taskId: "ready", orderNumber: "B", readyToSendCount: 1 }),
      order({
        taskId: "failed",
        orderNumber: "A",
        deliveryFailure: { reportId: "r", testLabel: "T", reason: "x", phone: "1" },
      }),
    ]);
    expect(sorted[0]!.taskId).toBe("failed");
  });
});

describe("computeCompletionKpis", () => {
  it("counts delivered separately from active buckets", () => {
    const kpis = computeCompletionKpis([
      order({
        hasPendingUpload: true,
        reports: [
          {
            reportId: "r1",
            testLabel: "CBC",
            status: "pending",
            deliveryState: "not_sent",
            artifacts: [],
            versions: [],
          },
        ],
      }),
      order({ readyToSendCount: 1 }),
      order({ isFullyComplete: true }),
    ]);
    expect(kpis).toMatchObject({
      pendingUploads: 1,
      readyToSend: 1,
      delivered: 1,
    });
  });
});

describe("filterOrdersByWorkflow", () => {
  it("all returns full list including delivered", () => {
    const list = filterOrdersByWorkflow(
      [order({ isFullyComplete: true }), order({ hasPendingUpload: true })],
      "all",
    );
    expect(list).toHaveLength(2);
  });
});
