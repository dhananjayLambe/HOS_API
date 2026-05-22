import { describe, expect, it } from "vitest";
import {
  canAdvance,
  canSubmit,
  getBlockedReason,
  getNextStep,
  getPreviousStep,
} from "@/lib/labs/reports/upload/upload-workflow-machine";

const baseCtx = {
  hasTaskIdInUrl: true,
  fileCount: 2,
  verified: true,
  canUpload: true,
  submitAttempted: false,
};

describe("upload-workflow-machine", () => {
  it("steps forward with taskId in url", () => {
    expect(getNextStep("files", true)).toBe("preview");
    expect(getNextStep("preview", true)).toBe("confirm");
    expect(getPreviousStep("confirm", true)).toBe("preview");
  });

  it("canAdvance requires files on files step", () => {
    expect(canAdvance("files", { ...baseCtx, fileCount: 0 })).toBe(false);
    expect(canAdvance("files", baseCtx)).toBe(true);
  });

  it("canSubmit on confirm requires verified", () => {
    expect(canSubmit("confirm", { ...baseCtx, verified: false })).toBe(false);
    expect(canSubmit("confirm", baseCtx)).toBe(true);
  });

  it("getBlockedReason for empty files", () => {
    expect(getBlockedReason("files", { ...baseCtx, fileCount: 0 }, "advance")).toBe(
      "Select at least one report file.",
    );
  });

  it("getBlockedReason for unverified submit", () => {
    expect(getBlockedReason("confirm", { ...baseCtx, verified: false }, "submit")).toBe(
      "Complete the verification checklist.",
    );
  });

  it("getBlockedReason when draft metadata without files", () => {
    expect(
      getBlockedReason(
        "files",
        { ...baseCtx, fileCount: 0, metadataOnlyCount: 2 },
        "advance",
      ),
    ).toBe("Please reselect report files to continue.");
  });
});

