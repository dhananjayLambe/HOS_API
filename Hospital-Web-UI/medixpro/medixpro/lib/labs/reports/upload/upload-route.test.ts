import { describe, expect, it } from "vitest";
import {
  buildUploadReturnHref,
  parseUploadWorkflowSearchParams,
  uploadPathForReupload,
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

  it("parses mode=reupload and reportId", () => {
    const params = new URLSearchParams(
      "taskId=task-1&reportId=report-2&mode=reupload",
    );
    const state = parseUploadWorkflowSearchParams(params);
    expect(state.mode).toBe("reupload");
    expect(state.reportId).toBe("report-2");
  });

  it("defaults mode to upload", () => {
    const state = parseUploadWorkflowSearchParams(new URLSearchParams("taskId=t1"));
    expect(state.mode).toBe("upload");
  });

  it("uploadPathForReupload builds deep link", () => {
    const path = uploadPathForReupload("task-1", "report-2", {
      returnUrl: "/lab-dashboard/reports",
      demo: "1",
    });
    expect(path).toContain("taskId=task-1");
    expect(path).toContain("reportId=report-2");
    expect(path).toContain("mode=reupload");
    expect(path).toContain("returnUrl=");
    expect(path).toContain("demo=1");
  });
});
