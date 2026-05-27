import {
  mapReportOperationalStatus,
  operationalStatusLabel,
  type ReportOperationalStatus,
} from "@/lib/labs/reports/report-operational-status";
import type { ReportLineContext } from "@/lib/labs/reports/report-task-context";

export type OrderReportLineItem = {
  reportId: string;
  lineId: string;
  testLabel: string;
  operationalStatus: ReportOperationalStatus;
  /** True when this line still needs a file upload (pending). */
  needsUpload: boolean;
  /** True when this line is the current upload_target for this session. */
  isCurrentUploadTarget: boolean;
};

export type OrderUploadProgress = {
  total: number;
  pendingUploadCount: number;
  uploadedCount: number;
  readyCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingUploadLabels: string[];
  /** No test lines still waiting for an initial upload. */
  isAllReportsUploaded: boolean;
  /** Every line is ready for delivery or delivered. */
  isOrderReadyForDelivery: boolean;
  /** Every line is delivered to the patient. */
  isOrderComplete: boolean;
  summary: string;
};

function isCurrentUploadTarget(
  line: ReportLineContext,
  uploadTarget?: { reportId: string; lineId: string } | null,
): boolean {
  if (!uploadTarget) return false;
  return line.lineId === uploadTarget.lineId || line.reportId === uploadTarget.reportId;
}

export function buildOrderReportLines(
  activeReports: ReportLineContext[],
  uploadTarget?: { reportId: string; lineId: string } | null,
): OrderReportLineItem[] {
  return activeReports.map((line) => {
    const operationalStatus = mapReportOperationalStatus(line.status);
    return {
      reportId: line.reportId,
      lineId: line.lineId,
      testLabel: line.testLabel,
      operationalStatus,
      needsUpload: operationalStatus === "PENDING_UPLOAD",
      isCurrentUploadTarget: isCurrentUploadTarget(line, uploadTarget),
    };
  });
}

export function computeOrderUploadProgress(lines: OrderReportLineItem[]): OrderUploadProgress {
  const total = lines.length;
  const pendingUploadLabels = lines.filter((l) => l.needsUpload).map((l) => l.testLabel);
  const pendingUploadCount = pendingUploadLabels.length;
  const uploadedCount = lines.filter((l) => l.operationalStatus === "UPLOADED").length;
  const readyCount = lines.filter((l) => l.operationalStatus === "READY_DELIVERY").length;
  const deliveredCount = lines.filter((l) => l.operationalStatus === "DELIVERED").length;
  const failedCount = lines.filter((l) => l.operationalStatus === "FAILED_DELIVERY").length;

  const isAllReportsUploaded = total > 0 && pendingUploadCount === 0;
  const isOrderReadyForDelivery =
    total > 0 && pendingUploadCount === 0 && uploadedCount === 0 && readyCount + deliveredCount === total;
  const isOrderComplete = total > 0 && deliveredCount === total;

  let summary: string;
  if (total === 0) {
    summary = "No test reports on this order yet.";
  } else if (isOrderComplete) {
    summary = `All ${total} reports delivered — order complete.`;
  } else if (isOrderReadyForDelivery) {
    summary = `All ${total} reports uploaded and ready for delivery.`;
  } else if (pendingUploadCount > 0) {
    const done = total - pendingUploadCount;
    summary =
      pendingUploadCount === 1
        ? `${done} of ${total} reports uploaded — ${pendingUploadLabels[0]} still needs upload.`
        : `${done} of ${total} reports uploaded — ${pendingUploadCount} still need upload.`;
  } else if (uploadedCount > 0) {
    summary = `${uploadedCount} of ${total} reports uploaded — mark remaining ready when files are verified.`;
  } else {
    summary = `${total} test report${total === 1 ? "" : "s"} on this order.`;
  }

  return {
    total,
    pendingUploadCount,
    uploadedCount,
    readyCount,
    deliveredCount,
    failedCount,
    pendingUploadLabels,
    isAllReportsUploaded,
    isOrderReadyForDelivery,
    isOrderComplete,
    summary,
  };
}

export function lineStatusLabel(status: ReportOperationalStatus): string {
  return operationalStatusLabel(status);
}
