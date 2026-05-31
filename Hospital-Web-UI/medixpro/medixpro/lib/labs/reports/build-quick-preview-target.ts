import type { QuickPreviewTarget } from "@/components/labs/reports/completion/QuickPreviewPanel";
import type { ReportDetail } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { buildTestWorkflow } from "@/lib/labs/reports/completion/operational-contract";
import { buildOrderLifecycleFromTaskContext } from "@/lib/labs/reports/completion/report-lifecycle-adapter";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";

function resolveReportIdFromContext(context: ReportTaskContext, requestedReportId: string): string | null {
  const exact = context.activeReports.find((row) => row.reportId === requestedReportId);
  if (exact) return exact.reportId;
  return context.activeReports[0]?.reportId ?? null;
}

/** Build quick-preview payload from live task context + optional detailed report. */
export function buildQuickPreviewTarget(
  context: ReportTaskContext,
  reportId: string,
  detail?: ReportDetail,
): QuickPreviewTarget | null {
  const resolvedReportId = resolveReportIdFromContext(context, reportId);
  if (!resolvedReportId) return null;
  const matchedDetail =
    detail && detail.reportId === resolvedReportId ? detail : undefined;
  const order = buildOrderLifecycleFromTaskContext(context, {
    detailsByReportId: matchedDetail ? { [resolvedReportId]: matchedDetail } : undefined,
  });
  const report = order.reports.find((row) => row.reportId === resolvedReportId);
  if (!report) return null;

  const workflow = buildTestWorkflow(report);
  return {
    taskId: context.taskId,
    reportId: resolvedReportId,
    patientName: context.patientName,
    orderNumber: context.orderNumber,
    testName: workflow.testName,
    deliveryState: workflow.deliveryState,
    corrected: workflow.corrected,
    isReuploaded: workflow.isReuploaded,
    artifacts: workflow.artifacts,
    canSend: workflow.availableActions.includes("SEND"),
    canReupload: workflow.availableActions.includes("REUPLOAD"),
  };
}

/** Demo / view-model-only preview path (no API context). */
export function buildQuickPreviewTargetFromOrder(
  order: OrderLifecycleViewModel,
  reportId: string,
): QuickPreviewTarget | null {
  const report =
    order.reports.find((row) => row.reportId === reportId) ?? order.reports[0];
  if (!report) return null;
  const workflow = buildTestWorkflow(report);
  return {
    taskId: order.taskId,
    reportId: report.reportId,
    patientName: order.patientName,
    orderNumber: order.orderNumber,
    testName: workflow.testName,
    deliveryState: workflow.deliveryState,
    corrected: workflow.corrected,
    isReuploaded: workflow.isReuploaded,
    artifacts: workflow.artifacts,
    canSend: workflow.availableActions.includes("SEND"),
    canReupload: workflow.availableActions.includes("REUPLOAD"),
  };
}
