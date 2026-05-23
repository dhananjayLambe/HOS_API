import type { ReportDetail } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";

/**
 * Keeps WORKFLOW STATUS → Report row in sync with the primary report detail query
 * while assignment refetch is in flight (60s staleTime).
 */
export function mergeOrderReportWorkflowStatus(
  order: LabOrderRow,
  detail: ReportDetail | undefined,
): LabOrderRow {
  if (!detail?.status) return order;
  return { ...order, reportStatus: detail.status };
}

/**
 * Report-queue drawer: backend `sample_status` is null when no `LabSampleTracking` row exists,
 * which renders as misleading "Pending". Tasks on the report queue are post-collection — infer
 * COLLECTED only when the API did not send sample_status.
 */
export function mergeOrderWorkflowForReportDrawer(
  order: LabOrderRow,
  options: { detail?: ReportDetail; task?: ReportTask | null },
): LabOrderRow {
  let merged = mergeOrderReportWorkflowStatus(order, options.detail);
  if (!merged.sampleStatus && options.task) {
    merged = { ...merged, sampleStatus: "COLLECTED" };
  }
  return merged;
}
