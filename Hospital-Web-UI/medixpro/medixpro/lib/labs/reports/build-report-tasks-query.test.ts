import { describe, expect, it } from "vitest";
import {
  buildReportTasksQueryParams,
  DEFAULT_REPORT_TASKS_FILTERS,
} from "@/lib/labs/reports/build-report-tasks-query";

describe("build-report-tasks-query", () => {
  it("defaults assignment status to all so ACCEPTED assignments appear in queue", () => {
    expect(DEFAULT_REPORT_TASKS_FILTERS.status).toBe("all");
  });

  it("omits status param when filter is all", () => {
    const params = buildReportTasksQueryParams(DEFAULT_REPORT_TASKS_FILTERS);
    expect(params.status).toBeUndefined();
  });

  it("includes status when filter is narrowed", () => {
    const params = buildReportTasksQueryParams({
      ...DEFAULT_REPORT_TASKS_FILTERS,
      status: "ACCEPTED",
    });
    expect(params.status).toBe("ACCEPTED");
  });

  it("includes cursor when provided for load-more flow", () => {
    const params = buildReportTasksQueryParams(DEFAULT_REPORT_TASKS_FILTERS, {
      cursor: "abc123",
    });
    expect(params.cursor).toBe("abc123");
  });

  it("uses explicit q override over filter search", () => {
    const params = buildReportTasksQueryParams(
      { ...DEFAULT_REPORT_TASKS_FILTERS, search: "from-filter" },
      { q: "from-override" },
    );
    expect(params.q).toBe("from-override");
  });
});
