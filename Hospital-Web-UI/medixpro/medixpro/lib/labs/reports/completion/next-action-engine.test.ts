import { buildNextAction } from "@/lib/labs/reports/completion/next-action-engine";
import type { OrderLifecycleViewModel, ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { describe, expect, it } from "vitest";

function chip(
  reportId: string,
  testLabel: string,
  status: ReportChipViewModel["status"],
  deliveryState: ReportChipViewModel["deliveryState"] = status === "sent" ? "sent" : "not_sent",
): ReportChipViewModel {
  return { reportId, testLabel, status, deliveryState, artifacts: [], versions: [] };
}

describe("buildNextAction", () => {
  const base = (reports: OrderLifecycleViewModel["reports"]): Pick<OrderLifecycleViewModel, "reports" | "deliveryFailure"> => ({
    reports,
  });

  it("prioritizes delivery failure", () => {
    const action = buildNextAction({
      ...base([chip("1", "CBC", "failed", "failed")]),
      deliveryFailure: {
        reportId: "1",
        testLabel: "CBC",
        reason: "Invalid number",
        phone: "999",
      },
    });
    expect(action.line).toContain("Retry");
    expect(action.showUpload).toBe(false);
  });

  it("suggests upload for pending report", () => {
    const action = buildNextAction(
      base([
        chip("1", "CBC", "sent", "sent"),
        chip("2", "ABPM", "pending"),
      ]),
    );
    expect(action.line).toBe("Upload ABPM Report");
    expect(action.showUpload).toBe(true);
    expect(action.uploadLabel).toBe("ABPM");
  });

  it("hides send available when nothing ready", () => {
    const action = buildNextAction(
      base([chip("1", "ABPM", "pending")]),
    );
    expect(action.showSendAvailable).toBe(false);
  });

  it("shows send available when ready reports exist alongside pending", () => {
    const action = buildNextAction(
      base([
        chip("1", "Lipid", "ready"),
        chip("2", "ABPM", "pending"),
      ]),
    );
    expect(action.showSendAvailable).toBe(true);
  });

  it("sets a specific send label for one ready report", () => {
    const action = buildNextAction(
      base([chip("1", "Thyroid", "ready")]),
    );
    expect(action.line).toBe("Send Thyroid Report");
    expect(action.sendLabel).toBe("Thyroid");
    expect(action.readyReportIds).toEqual(["1"]);
  });

  it("keeps generic send available for multiple ready reports", () => {
    const action = buildNextAction(
      base([
        chip("1", "Thyroid", "ready"),
        chip("2", "Vitamin D", "ready"),
      ]),
    );
    expect(action.showSendAvailable).toBe(true);
    expect(action.sendLabel).toBeUndefined();
    expect(action.readyReportIds).toEqual(["1", "2"]);
  });

  it("prioritizes updated reports needing resend before pending uploads", () => {
    const action = buildNextAction(
      base([
        chip("1", "Culture", "pending"),
        { ...chip("2", "CBC", "ready"), isReuploaded: true },
      ]),
    );
    expect(action.line).toBe("Resend updated CBC Report");
    expect(action.updatedReportId).toBe("2");
    expect(action.readyReportIds).toEqual(["2"]);
  });
});
