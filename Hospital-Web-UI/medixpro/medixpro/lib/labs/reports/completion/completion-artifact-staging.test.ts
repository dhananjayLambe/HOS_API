import {
  buildUploadToastMessage,
  mergeArtifactsIntoReport,
  reuploadReportVersion,
} from "@/lib/labs/reports/completion/completion-artifact-staging";
import type { ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { describe, expect, it } from "vitest";

describe("completion-artifact-staging", () => {
  const pendingChip = (): ReportChipViewModel => ({
    reportId: "r1",
    testLabel: "CBC",
    status: "pending",
    deliveryState: "not_sent",
    artifacts: [],
    versions: [],
  });

  it("builds single-file toast with filename", () => {
    expect(
      buildUploadToastMessage("CBC", [{ fileName: "cbc_results.pdf", mimeType: "application/pdf" }]),
    ).toBe("cbc_results.pdf uploaded");
  });

  it("builds multi-file toast with test label", () => {
    expect(
      buildUploadToastMessage("CBC", [
        { fileName: "a.pdf", mimeType: "application/pdf" },
        { fileName: "b.csv", mimeType: "text/csv" },
      ]),
    ).toBe("2 files uploaded for CBC");
  });

  it("merges artifacts and marks pending report ready", () => {
    const before = Date.now();
    const file = new File(["pdf"], "cbc.pdf", { type: "application/pdf" });
    const next = mergeArtifactsIntoReport(pendingChip(), [
      { fileName: "cbc.pdf", mimeType: "application/pdf", artifactType: "PRIMARY_REPORT", isPrimary: true, file },
    ]);
    expect(next.status).toBe("ready");
    expect(next.artifacts).toHaveLength(1);
    expect(next.artifacts[0]!.fileName).toBe("cbc.pdf");
    expect(next.artifacts[0]!.uploadedAtLabel).toBe("Just now");
    expect(next.artifacts[0]!.patientVisible).toBe(true);
    expect(next.artifacts[0]!.artifactType).toBe("PRIMARY_REPORT");
    expect(next.artifacts[0]!.previewFile).toBe(file);
    expect(Number(next.artifacts[0]!.id.split("-")[1])).toBeGreaterThanOrEqual(before);
  });

  it("appends to existing artifacts without changing sent status", () => {
    const sent: ReportChipViewModel = {
      reportId: "r2",
      testLabel: "Lipid",
      status: "sent",
      deliveryState: "sent",
      artifacts: [
        {
          id: "a1",
          fileName: "old.pdf",
          mimeType: "application/pdf",
          artifactType: "PRIMARY_REPORT",
          patientVisible: true,
          versionNumber: 1,
        },
      ],
      versions: [],
    };
    const next = mergeArtifactsIntoReport(sent, [{ fileName: "addendum.pdf", mimeType: "application/pdf" }]);
    expect(next.status).toBe("sent");
    expect(next.artifacts).toHaveLength(2);
  });

  it("creates an updated version without changing sibling history", () => {
    const report = mergeArtifactsIntoReport(pendingChip(), [
      { fileName: "cbc_v1.pdf", mimeType: "application/pdf" },
    ]);
    const next = reuploadReportVersion(report, [
      { fileName: "cbc_report_updated.pdf", mimeType: "application/pdf" },
    ], { reason: "Signed PDF replaced unsigned report" });

    expect(next.status).toBe("ready");
    expect(next.deliveryState).toBe("not_sent");
    expect(next.isReuploaded).toBe(true);
    expect(next.reuploadReason).toBe("Signed PDF replaced unsigned report");
    expect(next.versions).toHaveLength(2);
    expect(next.versions[0]!.isLatest).toBe(false);
    expect(next.versions[1]!.label).toBe("v2 Updated");
    expect(next.versions[1]!.reuploadReason).toBe("Signed PDF replaced unsigned report");
    expect(next.artifacts[0]!.fileName).toBe("cbc_report_updated.pdf");
  });
});
