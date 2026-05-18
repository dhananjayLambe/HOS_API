import { isUploadedOrBeyond, type ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";

export type ExistingReportItem = {
  taskId: string;
  label: string;
  orderNumber: string;
  status: ReportOperationalStatus;
};

/** Sibling tasks for same patient that already have uploads (Phase 1: status-based). */
export function existingReportsForPatient(
  allTasks: ReportTask[],
  patientKey: string,
  excludeTaskId?: string,
): ExistingReportItem[] {
  return allTasks
    .filter(
      (t) =>
        t.patientKey === patientKey &&
        t.taskId !== excludeTaskId &&
        isUploadedOrBeyond(t.operationalStatus),
    )
    .map((t) => ({
      taskId: t.taskId,
      label: t.testLabel,
      orderNumber: t.orderNumber,
      status: t.operationalStatus,
    }));
}
