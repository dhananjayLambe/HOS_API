import type { LabOrderRow } from "@/lib/labs/types";
import { sampleWorkflowLabel } from "@/lib/labs/orders/workflow-labels";

export type DashboardReportPipelineRow = {
  id: string;
  assignmentId: string;
  patient: string;
  testsLabel: string;
  statusLabel: string;
};

function normalizeReportStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

export function isReportPendingUpload(status: string | null | undefined): boolean {
  const s = normalizeReportStatus(status);
  return s === "" || s === "pending" || s === "in_progress";
}

export function isReportReadyForDelivery(status: string | null | undefined): boolean {
  return normalizeReportStatus(status) === "ready";
}

export function filterReportPendingUploadOrders(rows: LabOrderRow[]): LabOrderRow[] {
  return rows.filter((r) => isReportPendingUpload(r.reportStatus));
}

export function filterReportReadyOrders(rows: LabOrderRow[]): LabOrderRow[] {
  return rows.filter((r) => isReportReadyForDelivery(r.reportStatus));
}

export function mapOrderToPipelineRow(order: LabOrderRow): DashboardReportPipelineRow {
  return {
    id: order.orderUuid,
    assignmentId: order.assignmentId,
    patient: order.patient,
    testsLabel: order.tests.map((t) => t.name).join(", "),
    statusLabel: sampleWorkflowLabel(order.sampleStatus),
  };
}

export function collectionSuccessPercent(
  collectedToday: number,
  failedNoResponse: number,
): number | null {
  const denom = collectedToday + failedNoResponse;
  if (denom <= 0) return null;
  return Math.round((collectedToday / denom) * 100);
}

export function avgDailyOrders(ordersThisMonth: number, dayOfMonth: number): number {
  if (dayOfMonth <= 0) return 0;
  return Math.round((ordersThisMonth / dayOfMonth) * 10) / 10;
}

export function collectionsTodayCount(
  summary: {
    assigned_today: number;
    active_collections: number;
    pending_collections: number;
  },
  visitTodayTotal: number,
): number {
  return (
    summary.assigned_today +
    summary.active_collections +
    summary.pending_collections +
    visitTodayTotal
  );
}
