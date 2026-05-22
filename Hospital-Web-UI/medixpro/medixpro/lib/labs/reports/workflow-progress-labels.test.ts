import { describe, expect, it } from "vitest";
import {
  formatGroupProgressLabel,
  formatGroupProgressSecondary,
} from "@/lib/labs/reports/workflow-progress-labels";

describe("workflow-progress-labels", () => {
  it("formats uploaded progress with optional pending suffix", () => {
    expect(
      formatGroupProgressLabel({
        uploadedCount: 2,
        totalCount: 3,
        pendingCount: 1,
        completedCount: 0,
      }),
    ).toBe("2 of 3 reports uploaded · 1 pending");
  });

  it("omits pending suffix when all pending or none", () => {
    expect(
      formatGroupProgressLabel({
        uploadedCount: 0,
        totalCount: 2,
        pendingCount: 2,
        completedCount: 0,
      }),
    ).toBe("0 of 2 reports uploaded");

    expect(
      formatGroupProgressLabel({
        uploadedCount: 3,
        totalCount: 3,
        pendingCount: 0,
        completedCount: 3,
      }),
    ).toBe("3 of 3 reports uploaded");
  });

  it("returns empty label when total is zero", () => {
    expect(
      formatGroupProgressLabel({
        uploadedCount: 0,
        totalCount: 0,
        pendingCount: 0,
        completedCount: 0,
      }),
    ).toBe("");
  });

  it("formats secondary completed count", () => {
    expect(
      formatGroupProgressSecondary({
        uploadedCount: 1,
        totalCount: 2,
        pendingCount: 1,
        completedCount: 1,
      }),
    ).toBe("1 completed");
    expect(
      formatGroupProgressSecondary({
        uploadedCount: 0,
        totalCount: 1,
        pendingCount: 1,
        completedCount: 0,
      }),
    ).toBeNull();
  });
});
