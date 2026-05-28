import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isReportsDataSourceToggleVisible,
  isReportTasksV1ApiEnabled,
} from "@/lib/labs/reports/report-tasks-config";

describe("report-tasks-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides Live/Mock toggle by default", () => {
    vi.stubEnv("NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE", undefined);
    expect(isReportsDataSourceToggleVisible()).toBe(false);
  });

  it("shows Live/Mock toggle when env is true", () => {
    vi.stubEnv("NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE", "true");
    expect(isReportsDataSourceToggleVisible()).toBe(true);
  });

  it("enables v1 API by default", () => {
    vi.stubEnv("NEXT_PUBLIC_LAB_REPORTS_USE_V1_API", undefined);
    expect(isReportTasksV1ApiEnabled()).toBe(true);
  });
});
