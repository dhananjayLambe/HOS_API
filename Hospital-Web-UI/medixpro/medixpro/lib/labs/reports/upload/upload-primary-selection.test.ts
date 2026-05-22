import { describe, expect, it } from "vitest";
import {
  classifyFileKind,
  pickPrimaryFileId,
  primaryAfterRemove,
} from "@/lib/labs/reports/upload/upload-primary-selection";

describe("upload-primary-selection", () => {
  it("classifies pdf over csv", () => {
    expect(classifyFileKind("a.csv", "text/csv")).toBe("spreadsheet");
    expect(classifyFileKind("b.pdf", "application/pdf")).toBe("pdf");
  });

  it("picks PDF over image and spreadsheet", () => {
    const files = [
      { id: "1", name: "data.csv", type: "text/csv" },
      { id: "2", name: "scan.jpg", type: "image/jpeg" },
      { id: "3", name: "report.pdf", type: "application/pdf" },
    ];
    expect(pickPrimaryFileId(files)).toBe("3");
  });

  it("picks image over spreadsheet when no pdf", () => {
    const files = [
      { id: "1", name: "data.csv", type: "text/csv" },
      { id: "2", name: "scan.png", type: "image/png" },
    ];
    expect(pickPrimaryFileId(files)).toBe("2");
  });

  it("reassigns primary after remove", () => {
    const files = [
      { id: "a", name: "r.pdf", type: "application/pdf" },
      { id: "b", name: "s.jpg", type: "image/jpeg" },
    ];
    const remaining = files.filter((f) => f.id !== "a");
    expect(primaryAfterRemove(remaining, "a", "a")).toBe("b");
  });
});
