import { describe, expect, it } from "vitest";
import {
  countReportKpis,
  mapReportOperationalStatus,
  parseReportTabFromSearchParams,
  taskMatchesTab,
} from "@/lib/labs/reports/report-operational-status";

describe("report-operational-status", () => {
  it("maps API statuses to operational statuses", () => {
    expect(mapReportOperationalStatus(null)).toBe("PENDING_UPLOAD");
    expect(mapReportOperationalStatus("pending")).toBe("PENDING_UPLOAD");
    expect(mapReportOperationalStatus("in_progress")).toBe("UPLOADED");
    expect(mapReportOperationalStatus("ready")).toBe("READY_DELIVERY");
    expect(mapReportOperationalStatus("delivered")).toBe("DELIVERED");
    expect(mapReportOperationalStatus("rejected")).toBe("FAILED_DELIVERY");
  });

  it("filters tasks by tab", () => {
    expect(taskMatchesTab("UPLOADED", "uploaded")).toBe(true);
    expect(taskMatchesTab("UPLOADED", "pending")).toBe(false);
    expect(taskMatchesTab("READY_DELIVERY", "all")).toBe(true);
  });

  it("counts KPI buckets", () => {
    const statuses = [
      "PENDING_UPLOAD",
      "UPLOADED",
      "READY_DELIVERY",
      "DELIVERED",
      "FAILED_DELIVERY",
    ] as const;
    const counts = countReportKpis([...statuses], (i) => i === 3);
    expect(counts.pendingUpload).toBe(1);
    expect(counts.uploaded).toBe(1);
    expect(counts.readyDelivery).toBe(1);
    expect(counts.deliveredToday).toBe(1);
    expect(counts.failedDelivery).toBe(1);
  });

  it("parses tab query param", () => {
    expect(parseReportTabFromSearchParams("pending")).toBe("pending");
    expect(parseReportTabFromSearchParams("invalid")).toBe("all");
  });
});
