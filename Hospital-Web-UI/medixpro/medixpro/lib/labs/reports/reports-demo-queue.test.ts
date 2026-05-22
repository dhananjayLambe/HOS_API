import { describe, expect, it, beforeEach } from "vitest";
import { countReportKpis } from "@/lib/labs/reports/report-operational-status";
import {
  getDemoReportTasks,
  isReportsDemoForced,
  resetDemoReportTasksCache,
  shouldUseReportsDemoData,
} from "@/lib/labs/reports/reports-demo-queue";

describe("reports-demo-queue", () => {
  beforeEach(() => {
    resetDemoReportTasksCache();
  });

  it("returns a multi-patient fixture set", () => {
    const tasks = getDemoReportTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(12);
    const patients = new Set(tasks.map((t) => t.patientName));
    expect(patients.size).toBeGreaterThanOrEqual(8);
  });

  it("covers all KPI buckets", () => {
    const tasks = getDemoReportTasks();
    const kpis = countReportKpis(
      tasks.map((t) => t.operationalStatus),
      () => false,
    );
    expect(kpis.pendingUpload).toBeGreaterThan(0);
    expect(kpis.uploaded).toBeGreaterThan(0);
    expect(kpis.readyDelivery).toBeGreaterThan(0);
    expect(kpis.failedDelivery).toBeGreaterThan(0);
  });

  it("detects ?demo=1", () => {
    expect(isReportsDemoForced(new URLSearchParams("demo=1"))).toBe(true);
    expect(isReportsDemoForced(new URLSearchParams("demo=true"))).toBe(true);
    expect(isReportsDemoForced(new URLSearchParams("tab=pending"))).toBe(false);
  });

  it("uses demo only when explicitly forced", () => {
    expect(
      shouldUseReportsDemoData({ apiTaskCount: 5, loading: false, error: null, forceDemo: true }),
    ).toBe(true);
    expect(
      shouldUseReportsDemoData({ apiTaskCount: 0, loading: false, error: null, forceDemo: false }),
    ).toBe(false);
    expect(
      shouldUseReportsDemoData({ apiTaskCount: 0, loading: true, error: null, forceDemo: false }),
    ).toBe(false);
  });
});
