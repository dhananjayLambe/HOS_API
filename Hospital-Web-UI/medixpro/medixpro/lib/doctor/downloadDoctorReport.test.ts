import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/labs/reports/api/v1/reports-api", () => ({
  getReportDownloadUrl: vi.fn(),
  fetchArtifactBlob: vi.fn(),
}));

vi.mock("@/lib/labs/reports/completion/artifact-download", () => ({
  isAuthenticatedArtifactUrl: vi.fn(),
}));

import { getReportDownloadUrl, fetchArtifactBlob } from "@/lib/labs/reports/api/v1/reports-api";
import { isAuthenticatedArtifactUrl } from "@/lib/labs/reports/completion/artifact-download";
import { downloadDoctorReport } from "@/lib/doctor/downloadDoctorReport";

describe("downloadDoctorReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:mock"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  it("throws when download_url is null", async () => {
    vi.mocked(getReportDownloadUrl).mockResolvedValue({
      download_url: null,
      filename: "report.pdf",
    });

    await expect(downloadDoctorReport("report-1")).rejects.toThrow(
      "No download URL available for this report.",
    );
  });

  it("fetches authenticated artifact URLs via blob download", async () => {
    const apiUrl =
      "http://127.0.0.1:8000/api/v1/diagnostics/reports/r1/artifacts/a1/download/";
    vi.mocked(getReportDownloadUrl).mockResolvedValue({
      download_url: apiUrl,
      filename: "cbc.pdf",
    });
    vi.mocked(isAuthenticatedArtifactUrl).mockReturnValue(true);
    vi.mocked(fetchArtifactBlob).mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
      remove,
    } as unknown as HTMLAnchorElement;
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor);
    const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(() => anchor);

    await downloadDoctorReport("report-1");

    expect(fetchArtifactBlob).toHaveBeenCalledWith(apiUrl, { signal: undefined });
    expect(click).toHaveBeenCalled();

    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it("uses direct anchor download for external URLs", async () => {
    const externalUrl = "https://cdn.example.com/report.pdf";
    vi.mocked(getReportDownloadUrl).mockResolvedValue({
      download_url: externalUrl,
      filename: "report.pdf",
    });
    vi.mocked(isAuthenticatedArtifactUrl).mockReturnValue(false);

    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
      remove,
    } as unknown as HTMLAnchorElement;
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor);
    const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(() => anchor);

    await downloadDoctorReport("report-1");

    expect(fetchArtifactBlob).not.toHaveBeenCalled();
    expect(anchor.href).toBe(externalUrl);
    expect(click).toHaveBeenCalled();

    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });
});
