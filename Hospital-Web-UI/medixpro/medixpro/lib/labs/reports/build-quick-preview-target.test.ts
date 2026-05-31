import { describe, expect, it } from "vitest";
import {
  buildQuickPreviewTarget,
  buildQuickPreviewTargetFromOrder,
} from "@/lib/labs/reports/build-quick-preview-target";
import type { ReportDetail } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";

function context(): ReportTaskContext {
  return {
    taskId: "t1",
    assignmentId: "a1",
    orderUuid: "o1",
    orderNumber: "ORD-1",
    patientName: "Rahul",
    patientPhone: "9999999999",
    encounterId: null,
    collectionType: "HOME",
    visitOrSlotLabel: "Today",
    operationalStatus: "PENDING_UPLOAD",
    activeReports: [
      {
        reportId: "r1",
        lineId: "l1",
        testLabel: "CBC",
        status: "pending",
        deliveryStatus: "pending",
        availableActions: ["UPLOAD_REPORT", "VIEW_REPORT"],
      },
      {
        reportId: "r2",
        lineId: "l2",
        testLabel: "LFT",
        status: "ready",
        deliveryStatus: "PENDING",
        availableActions: ["VIEW_REPORT", "SEND_WHATSAPP"],
      },
    ],
    uploadTarget: null,
  };
}

function orderVm(): OrderLifecycleViewModel {
  return {
    taskId: "t1",
    orderNumber: "ORD-1",
    patientKey: "phone:9999999999",
    patientName: "Rahul",
    patientPhone: "9999999999",
    tatState: "safe",
    tatLabel: "TAT on track",
    urgency: "ROUTINE",
    reports: [
      {
        reportId: "r1",
        testLabel: "CBC",
        status: "pending",
        deliveryState: "not_sent",
        artifacts: [],
        versions: [],
        availableActions: ["UPLOAD_REPORT"],
      },
    ],
    nextAction: { line: "", showSendAvailable: false, showUpload: true, readyReportIds: [] },
    lastActivity: { atLabel: "now", byName: "System" },
    attentionReasons: [],
    isFullyComplete: false,
    readyToSendCount: 0,
    hasPendingUpload: true,
  };
}

function detail(reportId: string): ReportDetail {
  return {
    reportId,
    status: "ready",
    deliveryStatus: "pending",
    revisionNumber: 1,
    readyAt: null,
    deliveredAt: null,
    patientName: "Rahul",
    patientPhone: "9999999999",
    encounterId: null,
    artifacts: [
      {
        id: "a-non-primary",
        artifactId: "pub-a-non-primary",
        artifactType: "PDF",
        originalFilename: "secondary.pdf",
        downloadFilename: "secondary.pdf",
        fileSize: 10,
        contentType: "application/pdf",
        isPrimary: false,
        version: 1,
        uploadedAt: "",
        downloadUrl: "https://example.test/secondary.pdf",
      },
      {
        id: "a-primary",
        artifactId: "pub-a-primary",
        artifactType: "PDF",
        originalFilename: "primary.pdf",
        downloadFilename: "primary.pdf",
        fileSize: 20,
        contentType: "application/pdf",
        isPrimary: true,
        version: 2,
        uploadedAt: "",
        downloadUrl: "https://example.test/primary.pdf",
      },
    ],
    delivery: null,
    history: { supersedesId: null, supersededById: null },
    availableActions: ["VIEW_REPORT"],
  };
}

describe("buildQuickPreviewTarget", () => {
  it("uses requested report id when it exists in context", () => {
    const target = buildQuickPreviewTarget(context(), "r2");
    expect(target).not.toBeNull();
    expect(target?.reportId).toBe("r2");
    expect(target?.testName).toBe("LFT");
  });

  it("falls back to first context report when requested id is missing", () => {
    const target = buildQuickPreviewTarget(context(), "does-not-exist");
    expect(target).not.toBeNull();
    expect(target?.reportId).toBe("r1");
    expect(target?.testName).toBe("CBC");
  });

  it("returns null when context has no active reports", () => {
    const ctx = context();
    ctx.activeReports = [];
    const target = buildQuickPreviewTarget(ctx, "r1");
    expect(target).toBeNull();
  });

  it("ignores detail payload when it belongs to a different report", () => {
    const target = buildQuickPreviewTarget(context(), "missing", detail("r2"));
    expect(target).not.toBeNull();
    expect(target?.reportId).toBe("r1");
    expect(target?.artifacts).toHaveLength(0);
  });

  it("preserves primary artifact semantics for deterministic preview defaulting", () => {
    const target = buildQuickPreviewTarget(context(), "r1", detail("r1"));
    expect(target).not.toBeNull();
    expect(target?.artifacts.some((artifact) => artifact.isPrimary)).toBe(true);
  });
});

describe("buildQuickPreviewTargetFromOrder", () => {
  it("falls back to first report when requested report id is missing", () => {
    const target = buildQuickPreviewTargetFromOrder(orderVm(), "missing");
    expect(target).not.toBeNull();
    expect(target?.reportId).toBe("r1");
  });
});
