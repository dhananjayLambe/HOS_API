import { describe, expect, it } from "vitest";
import {
  applyReportsQueueFilters,
  buildActiveFilterChips,
  clearFilterChip,
  DEFAULT_REPORTS_QUEUE_FILTERS,
  filterOrdersByOperationalDate,
  mergeSearchIntentIntoFilters,
  parseReportSearchIntent,
} from "@/lib/labs/reports/completion/reports-queue-filters";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";

function order(partial: Partial<OrderLifecycleViewModel>): OrderLifecycleViewModel {
  return {
    taskId: partial.taskId ?? "t1",
    orderNumber: partial.orderNumber ?? "ORD-1",
    patientKey: partial.patientKey ?? "phone:1",
    patientName: partial.patientName ?? "Rahul",
    patientPhone: partial.patientPhone ?? "9999999999",
    tatState: partial.tatState ?? "safe",
    tatLabel: partial.tatLabel ?? "TAT on track",
    urgency: partial.urgency ?? "ROUTINE",
    reports: partial.reports ?? [],
    nextAction: partial.nextAction ?? {
      line: "",
      showSendAvailable: false,
      showUpload: false,
      readyReportIds: [],
    },
    lastActivity: partial.lastActivity ?? { atLabel: "now", byName: "System" },
    attentionReasons: partial.attentionReasons ?? [],
    isFullyComplete: partial.isFullyComplete ?? false,
    readyToSendCount: partial.readyToSendCount ?? 0,
    hasPendingUpload: partial.hasPendingUpload ?? false,
    operationalUpdatedAtIso: partial.operationalUpdatedAtIso ?? new Date().toISOString(),
    slaAnchorIso: partial.slaAnchorIso,
    tatBreached: partial.tatBreached,
    deliveryFailure: partial.deliveryFailure,
  };
}

describe("parseReportSearchIntent", () => {
  it("maps workflow and remaining q", () => {
    expect(parseReportSearchIntent("pending rahul")).toEqual({
      workflow: "pending",
      remainingQ: "rahul",
    });
  });

  it("maps ready and test token", () => {
    expect(parseReportSearchIntent("ready cbc")).toEqual({
      workflow: "ready",
      remainingQ: "cbc",
    });
  });

  it("maps tat and urgent toggles", () => {
    expect(parseReportSearchIntent("tat urgent")).toMatchObject({
      tatBreachedOnly: true,
      urgentOnly: true,
      remainingQ: "",
    });
  });

  it("maps tat30 to soon filter", () => {
    expect(parseReportSearchIntent("tat30")).toMatchObject({
      tatSoonOnly: true,
      remainingQ: "",
    });
  });
});

describe("applyReportsQueueFilters", () => {
  const orders = [
    order({ taskId: "pending", hasPendingUpload: true, isFullyComplete: false }),
    order({ taskId: "ready", readyToSendCount: 1, isFullyComplete: false }),
    order({ taskId: "done", isFullyComplete: true }),
  ];

  it("filters by workflow pending", () => {
    const result = applyReportsQueueFilters(orders, {
      ...DEFAULT_REPORTS_QUEUE_FILTERS,
      datePreset: "month",
      workflow: "pending",
    });
    expect(result.map((o) => o.taskId)).toEqual(["pending"]);
  });

  it("filters delivered workflow", () => {
    const result = applyReportsQueueFilters(orders, {
      ...DEFAULT_REPORTS_QUEUE_FILTERS,
      datePreset: "month",
      workflow: "delivered",
    });
    expect(result.map((o) => o.taskId)).toEqual(["done"]);
  });

  it("applies urgent + tat breached toggles together", () => {
    const now = new Date().toISOString();
    const result = applyReportsQueueFilters(
      [
        order({
          taskId: "match",
          urgency: "URGENT",
          tatState: "breached",
          tatBreached: true,
          operationalUpdatedAtIso: now,
        }),
        order({
          taskId: "urgent-only",
          urgency: "URGENT",
          tatState: "safe",
          tatBreached: false,
          operationalUpdatedAtIso: now,
        }),
      ],
      {
        ...DEFAULT_REPORTS_QUEUE_FILTERS,
        datePreset: "today",
        urgentOnly: true,
        tatBreachedOnly: true,
      },
    );
    expect(result.map((o) => o.taskId)).toEqual(["match"]);
  });

  it("does not apply text search in live mode when clientSearch=false", () => {
    const result = applyReportsQueueFilters(
      [order({ taskId: "a", patientName: "Rahul" }), order({ taskId: "b", patientName: "Neha" })],
      { ...DEFAULT_REPORTS_QUEUE_FILTERS, datePreset: "month", searchQ: "rahul" },
      { clientSearch: false },
    );
    expect(result.map((o) => o.taskId)).toEqual(["a", "b"]);
  });
});

describe("buildActiveFilterChips", () => {
  it("always includes date chip and workflow when set", () => {
    const chips = buildActiveFilterChips({
      ...DEFAULT_REPORTS_QUEUE_FILTERS,
      workflow: "pending",
      urgentOnly: true,
    });
    expect(chips.some((c) => c.id === "date")).toBe(true);
    expect(chips.some((c) => c.label === "Pending Upload")).toBe(true);
    expect(chips.some((c) => c.label === "Urgent")).toBe(true);
  });

  it("clears workflow via clearFilterChip", () => {
    const next = clearFilterChip(
      { ...DEFAULT_REPORTS_QUEUE_FILTERS, workflow: "failed" },
      "workflow",
    );
    expect(next.workflow).toBe("all");
  });
});

describe("filterOrdersByOperationalDate", () => {
  it("includes orders updated today", () => {
    const todayIso = new Date().toISOString();
    const list = filterOrdersByOperationalDate(
      [order({ operationalUpdatedAtIso: todayIso })],
      "today",
    );
    expect(list).toHaveLength(1);
  });

  it("uses custom date bounds", () => {
    const inRange = order({ taskId: "in", operationalUpdatedAtIso: "2026-05-05T10:00:00.000Z" });
    const outRange = order({ taskId: "out", operationalUpdatedAtIso: "2026-05-20T10:00:00.000Z" });
    const list = filterOrdersByOperationalDate([inRange, outRange], "custom", {
      from: "2026-05-01",
      to: "2026-05-10",
    });
    expect(list.map((o) => o.taskId)).toEqual(["in"]);
  });
});

describe("mergeSearchIntentIntoFilters", () => {
  it("keeps existing toggles when token removed from query", () => {
    const current = {
      ...DEFAULT_REPORTS_QUEUE_FILTERS,
      urgentOnly: true,
      tatBreachedOnly: true,
      workflow: "pending" as const,
    };
    const next = mergeSearchIntentIntoFilters(current, parseReportSearchIntent("rahul"));
    expect(next.urgentOnly).toBe(true);
    expect(next.tatBreachedOnly).toBe(true);
    expect(next.workflow).toBe("pending");
    expect(next.searchQ).toBe("rahul");
  });
});
