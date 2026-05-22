import type { ReportTaskContextApiData } from "@/lib/labs/reports/api/report-api-types";
import { mapApiOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

export type ReportLineContext = {
  reportId: string;
  lineId: string;
  testLabel: string;
  status: string;
  deliveryStatus: string;
  availableActions: string[];
};

/** Detail/upload context — loaded on demand, not per queue row. */
export type ReportTaskContext = {
  taskId: string;
  assignmentId: string;
  orderUuid: string;
  orderNumber: string;
  patientName: string;
  patientPhone: string;
  encounterId: string | null;
  collectionType: "HOME" | "VISIT";
  visitOrSlotLabel: string;
  operationalStatus: ReportOperationalStatus;
  activeReports: ReportLineContext[];
  /** Set when backend exposes upload_target on context DTO. */
  uploadTarget?: {
    reportId: string;
    lineId: string;
    operationalStatus: ReportOperationalStatus;
  } | null;
};

export function mapReportTaskContextDto(dto: ReportTaskContextApiData): ReportTaskContext {
  return {
    taskId: String(dto.task_id),
    assignmentId: String(dto.assignment_id),
    orderUuid: String(dto.order_uuid),
    orderNumber: dto.order_number,
    patientName: dto.patient.name,
    patientPhone: dto.patient.phone,
    encounterId: dto.patient.encounter_id,
    collectionType: dto.collection_type === "VISIT" ? "VISIT" : "HOME",
    visitOrSlotLabel: dto.visit_or_slot_label || "—",
    operationalStatus: mapApiOperationalStatus(dto.operational_status),
    activeReports: dto.active_reports.map((row) => ({
      reportId: String(row.report_id),
      lineId: String(row.line_id),
      testLabel: row.test_label,
      status: row.status,
      deliveryStatus: row.delivery_status,
      availableActions: row.available_actions ?? [],
    })),
    uploadTarget: dto.upload_target
      ? {
          reportId: String(dto.upload_target.report_id),
          lineId: String(dto.upload_target.line_id),
          operationalStatus: mapApiOperationalStatus(dto.upload_target.operational_status),
        }
      : null,
  };
}
