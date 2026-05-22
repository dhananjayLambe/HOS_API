import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_TASKS_FILTERS } from "@/lib/labs/reports/build-report-tasks-query";
import {
  reportDetailQueryKey,
  reportTasksQueryKey,
  reportsQueueKeyPrefix,
  serializeReportTaskFilters,
} from "@/lib/labs/reports/query-keys";

describe("query-keys", () => {
  it("serializes filters deterministically", () => {
    const a = serializeReportTaskFilters(DEFAULT_REPORT_TASKS_FILTERS, "all");
    const b = serializeReportTaskFilters({ ...DEFAULT_REPORT_TASKS_FILTERS }, "all");
    expect(a).toBe(b);
  });

  it("changes key when tab or urgent filter changes", () => {
    const base = reportTasksQueryKey("branch-1", DEFAULT_REPORT_TASKS_FILTERS, "all");
    const urgent = reportTasksQueryKey(
      "branch-1",
      { ...DEFAULT_REPORT_TASKS_FILTERS, urgentOnly: true },
      "all",
    );
    expect(base).not.toEqual(urgent);
  });

  it("uses stable invalidation prefixes", () => {
    expect(reportsQueueKeyPrefix("b1")).toEqual(["lab", "b1", "report-tasks"]);
    expect(reportDetailQueryKey("b1", "r1")).toEqual(["lab", "b1", "report-detail", "r1"]);
  });
});
