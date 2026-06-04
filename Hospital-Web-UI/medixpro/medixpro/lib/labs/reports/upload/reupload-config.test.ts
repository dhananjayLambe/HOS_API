import { describe, expect, it } from "vitest";
import {
  isReuploadMode,
  isReuploadReasonReady,
  resolveReuploadReason,
} from "@/lib/labs/reports/upload/reupload-config";

describe("reupload-config", () => {
  it("isReuploadMode", () => {
    expect(isReuploadMode("reupload")).toBe(true);
    expect(isReuploadMode("upload")).toBe(false);
    expect(isReuploadMode(null)).toBe(false);
  });

  it("resolveReuploadReason uses preset choice", () => {
    expect(resolveReuploadReason("Wrong file uploaded", "")).toBe("Wrong file uploaded");
  });

  it("resolveReuploadReason uses Other textarea", () => {
    expect(resolveReuploadReason("Other", "  Custom reason  ")).toBe("Custom reason");
  });

  it("resolveReuploadReason returns null when empty", () => {
    expect(resolveReuploadReason("", "")).toBeNull();
    expect(resolveReuploadReason("Other", "   ")).toBeNull();
  });

  it("isReuploadReasonReady", () => {
    expect(isReuploadReasonReady("Report regenerated", "")).toBe(true);
    expect(isReuploadReasonReady("Other", "")).toBe(false);
    expect(isReuploadReasonReady("Other", "note")).toBe(true);
  });
});
