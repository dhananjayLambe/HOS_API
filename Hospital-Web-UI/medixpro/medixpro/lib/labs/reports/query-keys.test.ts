import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_TASKS_FILTERS } from "@/lib/labs/reports/build-report-tasks-query";
import {
  labOrderAssignmentQueryKey,
  reportDetailQueryKey,
  reportHistoryQueryKey,
  reportTaskContextQueryKey,
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

  it("keeps drawer keys distinct from queue list key", () => {
    const queue = reportTasksQueryKey("b1", DEFAULT_REPORT_TASKS_FILTERS, "all");
    expect(labOrderAssignmentQueryKey("b1", "a1")[2]).toBe("order-assignment");
    expect(reportTaskContextQueryKey("b1", "t1")[2]).toBe("report-task-context");
    expect(reportHistoryQueryKey("b1", "r1")[2]).toBe("report-history");
    expect(queue[2]).toBe("report-tasks");
    expect(labOrderAssignmentQueryKey("b1", "a1")).not.toEqual(queue);
  });
});
