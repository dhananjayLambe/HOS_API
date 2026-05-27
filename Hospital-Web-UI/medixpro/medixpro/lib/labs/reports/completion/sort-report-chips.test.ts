import { sortReportChips } from "@/lib/labs/reports/completion/sort-report-chips";
import type { ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { describe, expect, it } from "vitest";

describe("sortReportChips", () => {
  const chip = (
    reportId: string,
    testLabel: string,
    status: ReportChipViewModel["status"],
  ): ReportChipViewModel => ({
    reportId,
    testLabel,
    status,
    deliveryState: status === "sent" ? "sent" : "not_sent",
    artifacts: [],
    versions: [],
  });

  it("sorts FAILED before PENDING before READY before SENT", () => {
    const input: ReportChipViewModel[] = [
      chip("1", "Thyroid", "sent"),
      chip("2", "ABPM", "pending"),
      chip("3", "CBC", "failed"),
      chip("4", "Lipid", "ready"),
    ];
    const sorted = sortReportChips(input);
    expect(sorted.map((c) => c.status)).toEqual(["failed", "pending", "ready", "sent"]);
  });
});
