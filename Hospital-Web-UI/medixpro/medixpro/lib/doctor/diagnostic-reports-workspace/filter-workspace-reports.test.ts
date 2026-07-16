import { describe, expect, it } from "vitest";
import { createDemoReports } from "@/components/doctor/diagnostic-reports-workspace/mock/workspace-demo-fixtures";
import {
  computeQueueCounts,
  filterReports,
  matchesQueue,
  sortReportsForBrowser,
} from "@/lib/doctor/diagnostic-reports-workspace/filter-workspace-reports";
import { parseWorkspaceUrlState } from "@/lib/doctor/diagnostic-reports-workspace/url-state";

describe("diagnostic reports workspace filters", () => {
  const reports = createDemoReports();

  it("computes three operational queue counts", () => {
    const counts = computeQueueCounts(reports);
    expect(counts.reports_ready).toBeGreaterThan(0);
    expect(counts.awaiting).toBeGreaterThan(0);
    expect(counts.critical).toBe(0);
    expect("todays_uploaded" in counts).toBe(false);
  });

  it("filters reports_ready queue", () => {
    const filtered = filterReports(reports, { queue: "reports_ready" });
    expect(filtered.every((r) => matchesQueue(r, "reports_ready"))).toBe(true);
  });

  it("sorts reports ready before awaiting", () => {
    const sorted = sortReportsForBrowser(reports);
    const firstReadyIdx = sorted.findIndex((r) => matchesQueue(r, "reports_ready"));
    const firstAwaitingIdx = sorted.findIndex((r) => r.clinicalStatus === "AWAITING_REPORT");
    if (firstReadyIdx >= 0 && firstAwaitingIdx >= 0) {
      expect(firstReadyIdx).toBeLessThan(firstAwaitingIdx);
    }
  });

  it("filters by branch advanced filter", () => {
    const filtered = filterReports(reports, {
      advanced: {
        dateFrom: "",
        dateTo: "",
        lab: "",
        category: "",
        doctor: "",
        branch: "Kolhapur Main",
        status: "",
      },
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.branchName === "Kolhapur Main")).toBe(true);
  });

  it("searches by patient and test", () => {
    const byName = filterReports(reports, { q: "Ramesh" });
    expect(byName.some((r) => r.patient.name.includes("Ramesh"))).toBe(true);
    const byTest = filterReports(reports, { q: "CBC" });
    expect(byTest.some((r) => r.testName.includes("CBC"))).toBe(true);
  });

  it("parses pending_review legacy bucket and status filters", () => {
    const state = parseWorkspaceUrlState(
      new URLSearchParams(
        "bucket=pending_review&q=Priya&status=AVAILABLE&page=2"
      )
    );
    expect(state.queue).toBe("reports_ready");
    expect(state.q).toBe("Priya");
    expect(state.advanced.status).toBe("AVAILABLE");
    expect(state.page).toBe(2);
  });
});
