import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

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
  pendingSiblingCount: number;
  historicalReports: UploadHistoricalReport[];
};

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
    pendingSiblingCount: options?.pendingSiblingCount ?? 0,
    historicalReports: ctx.activeReports.map((r) => ({
      reportId: r.reportId,
      lineId: r.lineId,
      testLabel: r.testLabel,
      status: r.status,
      deliveryStatus: r.deliveryStatus,
    })),
  };
}
