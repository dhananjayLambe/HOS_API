import { describe, expect, it } from "vitest";
import {
  getUploadPrimaryButtonLabel,
  getUploadPrimaryDisabledReason,
  isUploadPrimaryEnabled,
  UPLOAD_ACTION_BAR_CLASSNAME,
} from "@/lib/labs/reports/upload/upload-validation-messages";

describe("upload-validation-messages", () => {
  const ctx = {
    hasTaskIdInUrl: true,
    fileCount: 1,
    verified: false,
    canUpload: true,
    submitAttempted: false,
    step: "confirm" as const,
  };

  it("labels per step", () => {
    expect(getUploadPrimaryButtonLabel("files")).toBe("Continue");
    expect(getUploadPrimaryButtonLabel("preview")).toBe("Review & Confirm");
    expect(getUploadPrimaryButtonLabel("confirm")).toBe("Upload Reports");
  });

  it("disabled reason when not verified on confirm", () => {
    expect(getUploadPrimaryDisabledReason(ctx)).toBe("Complete the verification checklist.");
    expect(isUploadPrimaryEnabled(ctx)).toBe(false);
  });

  it("action bar is in-flow (not fixed viewport footer)", () => {
    expect(UPLOAD_ACTION_BAR_CLASSNAME).toContain("rounded-xl");
    expect(UPLOAD_ACTION_BAR_CLASSNAME).not.toContain("fixed bottom-0");
  });
});
