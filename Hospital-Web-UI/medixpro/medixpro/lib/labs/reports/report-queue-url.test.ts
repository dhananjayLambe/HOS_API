import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_TASKS_FILTERS } from "@/lib/labs/reports/build-report-tasks-query";
import {
  buildCompletionQueueSearchParams,
  buildReportQueueSearchParams,
  parseCompletionQueueSearchParams,
  parseReportQueueSearchParams,
  reportQueuePathFromParams,
} from "@/lib/labs/reports/report-queue-url";

describe("report-queue-url", () => {
  it("parses tab, filters, and search from URL", () => {
    const params = new URLSearchParams(
      "tab=pending&urgent=1&tat=1&collection=HOME&q=smith&demo=1",
    );
    const state = parseReportQueueSearchParams(params);
    expect(state.tab).toBe("pending");
    expect(state.searchInput).toBe("smith");
    expect(state.filters.urgentOnly).toBe(true);
    expect(state.filters.tatOnly).toBe(true);
    expect(state.filters.collectionType).toBe("HOME");
  });

  it("round-trips queue state while preserving unrelated params", () => {
    const existing = new URLSearchParams("demo=1&foo=bar");
    const built = buildReportQueueSearchParams(existing, {
      tab: "ready",
      searchInput: "pat-12",
      filters: {
        ...DEFAULT_REPORT_TASKS_FILTERS,
        urgentOnly: true,
        collectionType: "VISIT",
      },
    });
    expect(built.get("demo")).toBe("1");
    expect(built.get("foo")).toBe("bar");
    expect(built.get("tab")).toBe("ready");
    expect(built.get("q")).toBe("pat-12");
    expect(built.get("urgent")).toBe("1");
    expect(built.get("collection")).toBe("VISIT");
    expect(built.has("tat")).toBe(false);

    const reparsed = parseReportQueueSearchParams(built);
    expect(reparsed.tab).toBe("ready");
    expect(reparsed.searchInput).toBe("pat-12");
    expect(reparsed.filters.urgentOnly).toBe(true);
    expect(reparsed.filters.collectionType).toBe("VISIT");
  });

  it("clears tab and filters when set to defaults", () => {
    const existing = new URLSearchParams("tab=failed&urgent=1&tat=1&collection=HOME&q=x");
    const built = buildReportQueueSearchParams(existing, {
      tab: "all",
      searchInput: "",
      filters: DEFAULT_REPORT_TASKS_FILTERS,
    });
    expect(built.has("tab")).toBe(false);
    expect(built.has("urgent")).toBe(false);
    expect(built.has("tat")).toBe(false);
    expect(built.has("collection")).toBe(false);
    expect(built.has("q")).toBe(false);
  });

  it("builds reports path with query string", () => {
    const params = new URLSearchParams("tab=pending");
    expect(reportQueuePathFromParams(params)).toBe("/lab-dashboard/reports?tab=pending");
    expect(reportQueuePathFromParams(new URLSearchParams())).toBe("/lab-dashboard/reports");
  });
});

describe("completion queue URL", () => {
  it("defaults to today and all workflow", () => {
    const state = parseCompletionQueueSearchParams(new URLSearchParams());
    expect(state.datePreset).toBe("today");
    expect(state.workflow).toBe("all");
  });

  it("round-trips workflow, date, toggles, and q", () => {
    const built = buildCompletionQueueSearchParams(new URLSearchParams(), {
      workflow: "pending",
      datePreset: "week",
      urgentOnly: true,
      tatBreachedOnly: true,
      searchQ: "rahul",
    });
    expect(built.get("workflow")).toBe("pending");
    expect(built.get("date")).toBe("week");
    expect(built.get("urgent")).toBe("1");
    expect(built.get("tat")).toBe("1");
    expect(built.get("q")).toBe("rahul");

    const reparsed = parseCompletionQueueSearchParams(built);
    expect(reparsed.workflow).toBe("pending");
    expect(reparsed.datePreset).toBe("week");
    expect(reparsed.urgentOnly).toBe(true);
    expect(reparsed.tatBreachedOnly).toBe(true);
    expect(reparsed.searchQ).toBe("rahul");
  });

  it("round-trips custom date bounds and tat30", () => {
    const built = buildCompletionQueueSearchParams(new URLSearchParams("demo=1"), {
      workflow: "failed",
      datePreset: "custom",
      customFrom: "2026-05-01",
      customTo: "2026-05-10",
      tatSoonOnly: true,
      searchQ: "cbc",
    });
    expect(built.get("demo")).toBe("1");
    expect(built.get("workflow")).toBe("failed");
    expect(built.get("date")).toBe("custom");
    expect(built.get("from")).toBe("2026-05-01");
    expect(built.get("to")).toBe("2026-05-10");
    expect(built.get("tat30")).toBe("1");

    const reparsed = parseCompletionQueueSearchParams(built);
    expect(reparsed.datePreset).toBe("custom");
    expect(reparsed.customFrom).toBe("2026-05-01");
    expect(reparsed.customTo).toBe("2026-05-10");
    expect(reparsed.tatSoonOnly).toBe(true);
    expect(reparsed.workflow).toBe("failed");
  });
});
