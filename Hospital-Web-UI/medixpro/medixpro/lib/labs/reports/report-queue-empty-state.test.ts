import { describe, expect, it } from "vitest";
import { resolveQueueEmptyState } from "@/lib/labs/reports/report-queue-empty-state";

describe("resolveQueueEmptyState", () => {
  it("returns load_error when isError", () => {
    const state = resolveQueueEmptyState({
      isError: true,
      totalTaskCount: 0,
      filteredTaskCount: 0,
      tab: "all",
      searchQuery: "",
    });
    expect(state?.kind).toBe("load_error");
  });

  it("returns no_tasks when queue is empty", () => {
    const state = resolveQueueEmptyState({
      isError: false,
      totalTaskCount: 0,
      filteredTaskCount: 0,
      tab: "all",
      searchQuery: "",
    });
    expect(state?.kind).toBe("no_tasks");
  });

  it("returns search_empty when search has no hits", () => {
    const state = resolveQueueEmptyState({
      isError: false,
      totalTaskCount: 5,
      filteredTaskCount: 0,
      tab: "all",
      searchQuery: "zzz",
    });
    expect(state?.kind).toBe("search_empty");
  });

  it("returns search_empty when backend returns zero rows for active search", () => {
    const state = resolveQueueEmptyState({
      isError: false,
      totalTaskCount: 0,
      filteredTaskCount: 0,
      tab: "all",
      searchQuery: "zzz",
    });
    expect(state?.kind).toBe("search_empty");
  });

  it("returns tab_empty for active tab with no matches", () => {
    const state = resolveQueueEmptyState({
      isError: false,
      totalTaskCount: 3,
      filteredTaskCount: 0,
      tab: "pending",
      searchQuery: "",
    });
    expect(state?.kind).toBe("tab_empty");
  });

  it("returns null when tasks are visible", () => {
    const state = resolveQueueEmptyState({
      isError: false,
      totalTaskCount: 3,
      filteredTaskCount: 2,
      tab: "all",
      searchQuery: "",
    });
    expect(state).toBeNull();
  });
});
