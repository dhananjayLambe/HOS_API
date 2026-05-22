import { describe, expect, it } from "vitest";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import {
  collectionTypeBadgeClassName,
  queueStatusTokens,
  reportStatusBadgeClassName,
  taskRowContainerClassName,
} from "@/lib/labs/reports/queue-tokens";

const ALL_OPERATIONAL: ReportOperationalStatus[] = [
  "PENDING_UPLOAD",
  "UPLOADED",
  "READY_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
];

describe("queue-tokens", () => {
  it("defines badge and row tokens for every operational status", () => {
    for (const status of ALL_OPERATIONAL) {
      const token = queueStatusTokens[status];
      expect(token?.border, status).toBeTruthy();
      expect(token?.bg, status).toBeTruthy();
      expect(token?.badge, status).toBeTruthy();
      expect(reportStatusBadgeClassName(status)).toContain("font-semibold");
      expect(taskRowContainerClassName(status)).toContain("border-l-[3px]");
    }
  });

  it("exposes collection type badge classes", () => {
    expect(collectionTypeBadgeClassName("HOME")).toContain("violet");
    expect(collectionTypeBadgeClassName("VISIT")).toContain("slate");
  });
});
