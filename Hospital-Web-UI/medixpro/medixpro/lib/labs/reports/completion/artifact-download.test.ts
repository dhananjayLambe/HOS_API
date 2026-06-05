import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReportArtifactViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  canDownloadArtifact,
  isAuthenticatedArtifactUrl,
  resolveArtifactDownloadSource,
} from "@/lib/labs/reports/completion/artifact-download";

function artifact(overrides: Partial<ReportArtifactViewModel> = {}): ReportArtifactViewModel {
  return {
    id: "art-1",
    fileName: "report.pdf",
    mimeType: "application/pdf",
    artifactType: "PRIMARY_REPORT",
    patientVisible: true,
    ...overrides,
  };
}

describe("artifact-download", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { origin: "http://localhost:3000" });
  });

  it("detects JWT-protected artifact download API URLs", () => {
    expect(
      isAuthenticatedArtifactUrl(
        "http://127.0.0.1:8000/api/v1/diagnostics/reports/abc/artifacts/def/download/",
      ),
    ).toBe(true);
    expect(isAuthenticatedArtifactUrl("https://cdn.example.com/report.pdf")).toBe(false);
  });

  it("prefers downloadUrl over previewUrl and remote blob", () => {
    const source = resolveArtifactDownloadSource(
      artifact({
        downloadUrl: "http://127.0.0.1:8000/api/v1/diagnostics/reports/r1/artifacts/a1/download/",
        previewUrl: "http://127.0.0.1:8000/api/v1/diagnostics/reports/r1/artifacts/a1/download/?inline=1",
      }),
      { remoteBlobUrl: "blob:http://localhost/abc" },
    );
    expect(source).toEqual({
      kind: "api",
      url: "http://127.0.0.1:8000/api/v1/diagnostics/reports/r1/artifacts/a1/download/",
    });
  });

  it("uses previewUrl when downloadUrl is absent", () => {
    const source = resolveArtifactDownloadSource(
      artifact({
        previewUrl: "http://127.0.0.1:8000/api/v1/diagnostics/reports/r1/artifacts/a1/download/?inline=1",
      }),
    );
    expect(source?.kind).toBe("api");
  });

  it("uses remoteBlobUrl only when server URLs are absent", () => {
    const source = resolveArtifactDownloadSource(artifact(), {
      remoteBlobUrl: "blob:http://localhost/abc",
    });
    expect(source).toEqual({ kind: "blob", url: "blob:http://localhost/abc" });
  });

  it("uses previewFile when no URLs or remote blob exist", () => {
    const file = new File(["pdf"], "local.pdf", { type: "application/pdf" });
    const source = resolveArtifactDownloadSource(artifact({ previewFile: file }));
    expect(source).toEqual({ kind: "file", file });
  });

  it("canDownloadArtifact mirrors resolver availability", () => {
    expect(canDownloadArtifact(artifact({ downloadUrl: "http://example.test/dl" }))).toBe(true);
    expect(canDownloadArtifact(artifact(), { remoteBlobUrl: "blob:x" })).toBe(true);
    expect(canDownloadArtifact(artifact())).toBe(false);
  });
});
