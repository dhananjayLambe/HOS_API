import { describe, expect, it } from "vitest";
import {
  isWorkspaceAccessApiUrl,
  normalizeWorkspaceAccessUrl,
} from "@/lib/doctor/diagnostic-reports-workspace/resolve-workspace-access-url";

describe("workspace access URL helpers", () => {
  it("normalizes bare /workspace/reports paths under /api/v1/doctors/reports", () => {
    expect(
      normalizeWorkspaceAccessUrl(
        "/workspace/reports/4915761b-1675-40e8-a434-16fd54a646c3/preview/?clinic_id=x"
      )
    ).toBe(
      "/api/v1/doctors/reports/workspace/reports/4915761b-1675-40e8-a434-16fd54a646c3/preview/?clinic_id=x"
    );
  });

  it("detects workspace preview and download API paths", () => {
    expect(
      isWorkspaceAccessApiUrl(
        "/api/v1/doctors/reports/workspace/reports/4915761b-1675-40e8-a434-16fd54a646c3/preview/?clinic_id=x"
      )
    ).toBe(true);
    expect(
      isWorkspaceAccessApiUrl(
        "/workspace/reports/4915761b-1675-40e8-a434-16fd54a646c3/download/?clinic_id=x"
      )
    ).toBe(true);
  });

  it("rejects non-workspace URLs", () => {
    expect(isWorkspaceAccessApiUrl("https://cdn.example.com/file.pdf")).toBe(false);
    expect(isWorkspaceAccessApiUrl("data:text/html,hi")).toBe(false);
    expect(isWorkspaceAccessApiUrl(null)).toBe(false);
  });
});
