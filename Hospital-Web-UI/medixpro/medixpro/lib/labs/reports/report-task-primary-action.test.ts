import { describe, expect, it } from "vitest";
import { getPrimaryTaskAction } from "@/lib/labs/reports/report-task-primary-action";

describe("report-task-primary-action", () => {
  it("returns upload link for pending upload", () => {
    const action = getPrimaryTaskAction("task-abc", "PENDING_UPLOAD");
    expect(action).toEqual({
      kind: "link",
      label: "Upload report",
      href: "/lab-dashboard/reports/upload?taskId=task-abc",
    });
  });

  it("returns mark ready button for uploaded", () => {
    const action = getPrimaryTaskAction("t1", "UPLOADED");
    expect(action).toMatchObject({ kind: "button", label: "Mark ready", actionKey: "ready" });
  });

  it("returns retry for failed delivery", () => {
    const action = getPrimaryTaskAction("t1", "FAILED_DELIVERY");
    expect(action).toMatchObject({ kind: "button", label: "Retry delivery", actionKey: "retry" });
  });
});
