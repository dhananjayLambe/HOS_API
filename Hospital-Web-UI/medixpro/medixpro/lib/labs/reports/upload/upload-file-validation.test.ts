import { describe, expect, it } from "vitest";
import {
  isAcceptedFileType,
  REPORT_UPLOAD_MAX_BYTES,
  rejectionReasonMessage,
  validateIncomingFiles,
} from "@/lib/labs/reports/upload/upload-file-validation";

function mockFile(name: string, size = 1024, type = "application/pdf"): File {
  const file = new File(["x"], name, { type, lastModified: 1 });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("upload-file-validation", () => {
  it("accepts valid pdf", () => {
    const file = mockFile("report.pdf");
    expect(isAcceptedFileType(file)).toBe(true);
    const { accepted, rejected } = validateIncomingFiles([file], []);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejects duplicate by id", () => {
    const file = mockFile("report.pdf");
    const existing = [
      {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: "report.pdf",
        size: file.size,
        type: "application/pdf",
      },
    ];
    const { accepted, rejected } = validateIncomingFiles([file], existing);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("duplicate");
    expect(rejectionReasonMessage("duplicate")).toBe("Duplicate file detected");
  });

  it("rejects duplicate by filename size and mime type", () => {
    const file = mockFile("cbc.pdf", 2048, "application/pdf");
    const existing = [
      {
        id: "different-last-modified-id",
        name: "cbc.pdf",
        size: 2048,
        type: "application/pdf",
      },
    ];
    const { accepted, rejected } = validateIncomingFiles([file], existing);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("duplicate");
  });

  it("rejects oversized file", () => {
    const file = mockFile("big.pdf", REPORT_UPLOAD_MAX_BYTES + 1);
    const { rejected } = validateIncomingFiles([file], []);
    expect(rejected[0]?.reason).toBe("too_large");
  });

  it("rejects unsupported type", () => {
    const file = mockFile("notes.doc", 100, "application/msword");
    const { rejected } = validateIncomingFiles([file], []);
    expect(rejected[0]?.reason).toBe("unsupported");
    expect(rejectionReasonMessage("unsupported")).toBe("Unsupported file type");
  });

  it("accepts only the supported image formats", () => {
    expect(isAcceptedFileType(mockFile("scan.jpg", 100, "image/jpeg"))).toBe(true);
    expect(isAcceptedFileType(mockFile("scan.png", 100, "image/png"))).toBe(true);
    expect(isAcceptedFileType(mockFile("scan.gif", 100, "image/gif"))).toBe(false);
  });

  it("rejects executable uploads", () => {
    const file = mockFile("payload.exe", 100, "application/x-msdownload");
    const { accepted, rejected } = validateIncomingFiles([file], []);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]?.reason).toBe("unsupported");
  });
});
