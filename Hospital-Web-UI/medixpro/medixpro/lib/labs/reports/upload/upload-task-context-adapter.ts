import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import {
  buildOrderReportLines,
  computeOrderUploadProgress,
  type OrderReportLineItem,
  type OrderUploadProgress,
} from "@/lib/labs/reports/upload/order-report-lines";

export type UploadHistoricalReport = {
  reportId: string;
  lineId: string;
  testLabel: string;
  status: string;
  deliveryStatus: string;
};

/** Upload workflow view model — decoupled from queue list DTOs. */
export type UploadTaskContext = {
  taskId: string;
  assignmentId: string;
  orderUuid: string;
  orderNumber: string;
  patientName: string;
  patientPhone: string;
  collectionType: "HOME" | "VISIT";
  visitOrSlotLabel: string;
  operationalStatus: ReportOperationalStatus;
  testLabels: string[];
  testLabelSummary: string;
  /** Test line this upload will attach to (from backend upload_target). */
  uploadTestLabel: string;
  /** Per-test-line status for multi-test orders. */
  reportLines: OrderReportLineItem[];
  uploadProgress: OrderUploadProgress;
  pendingSiblingCount: number;
  /** @deprecated Use reportLines */
  historicalReports: UploadHistoricalReport[];
};

function resolveUploadTestLabel(ctx: ReportTaskContext): string {
  if (ctx.uploadTarget) {
    const matched = ctx.activeReports.find(
      (r) =>
        r.lineId === ctx.uploadTarget!.lineId ||
        r.reportId === ctx.uploadTarget!.reportId,
    );
    if (matched?.testLabel) return matched.testLabel;
  }

  const uploadLine = ctx.activeReports.find((r) =>
    r.availableActions.includes("UPLOAD_REPORT"),
  );
  if (uploadLine?.testLabel) return uploadLine.testLabel;

  const uniqueLabels = [...new Set(ctx.activeReports.map((r) => r.testLabel).filter(Boolean))];
  if (uniqueLabels.length === 1) return uniqueLabels[0];
  if (uniqueLabels.length > 1) return uniqueLabels.join(", ");
  return "Report task";
}

export function adaptReportTaskContext(
  ctx: ReportTaskContext,
  options?: { pendingSiblingCount?: number },
): UploadTaskContext {
  const testLabels = ctx.activeReports.map((r) => r.testLabel);
  const uniqueLabels = [...new Set(testLabels)];
  const testLabelSummary =
    uniqueLabels.length > 0
      ? uniqueLabels.join(", ")
      : "Report task";

  const reportLines = buildOrderReportLines(ctx.activeReports, ctx.uploadTarget);
  const uploadProgress = computeOrderUploadProgress(reportLines);
  const historicalReports = ctx.activeReports.map((r) => ({
    reportId: r.reportId,
    lineId: r.lineId,
    testLabel: r.testLabel,
    status: r.status,
    deliveryStatus: r.deliveryStatus,
  }));

  return {
    taskId: ctx.taskId,
    assignmentId: ctx.assignmentId,
    orderUuid: ctx.orderUuid,
    orderNumber: ctx.orderNumber,
    patientName: ctx.patientName,
    patientPhone: ctx.patientPhone,
    collectionType: ctx.collectionType,
    visitOrSlotLabel: ctx.visitOrSlotLabel,
    operationalStatus: ctx.operationalStatus,
    testLabels: uniqueLabels,
    testLabelSummary,
    uploadTestLabel: resolveUploadTestLabel(ctx),
    reportLines,
    uploadProgress,
    pendingSiblingCount: options?.pendingSiblingCount ?? 0,
    historicalReports,
  };
}
