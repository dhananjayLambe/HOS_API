import { describe, expect, it } from "vitest";
import {
  buildUploadReturnHref,
  parseUploadWorkflowSearchParams,
  validateTaskId,
} from "@/lib/labs/reports/upload/upload-route";

describe("upload-route", () => {
  it("parses taskId and preserves demo", () => {
    const params = new URLSearchParams("taskId=task-abc&demo=1&returnUrl=%2Flab-dashboard%2Freports%3Ftab%3Dpending");
    const state = parseUploadWorkflowSearchParams(params);
    expect(state.taskId).toBe("task-abc");
    expect(state.demo).toBe("1");
    expect(state.returnUrl).toBe("/lab-dashboard/reports?tab=pending");
    expect(state.taskIdMalformed).toBe(false);
  });

  it("flags malformed taskId", () => {
    const params = new URLSearchParams("taskId=bad%20id");
    const state = parseUploadWorkflowSearchParams(params);
    expect(state.taskId).toBeNull();
    expect(state.taskIdMalformed).toBe(true);
  });

  it("buildUploadReturnHref preserves valid returnUrl", () => {
    expect(buildUploadReturnHref("/lab-dashboard/reports?tab=ready")).toBe(
      "/lab-dashboard/reports?tab=ready",
    );
  });

  it("rejects external returnUrl", () => {
    expect(buildUploadReturnHref("https://evil.com")).toBe("/lab-dashboard/reports?tab=pending");
  });

  it("validateTaskId accepts demo ids", () => {
    expect(validateTaskId("demo-pending-1")).toBe("ok");
  });
});
