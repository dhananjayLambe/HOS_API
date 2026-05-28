import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import type {
  DeliveryLogApiItem,
  ReportActionTargetsApi,
  ReportArtifactApiItem,
  ReportDetailApiData,
  ReportHistoryApiData,
  ReportLineReportApiItem,
  ReportSummaryApiItem,
  ReportTaskApiItem,
  ReportTaskContextApiData,
} from "@/lib/labs/reports/api/report-api-types";
import {
  formatRelativeCollected,
  formatReportTimestamp,
} from "@/lib/labs/reports/format-report-timestamp";
import { mapApiOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import {
  mapReportTaskContextDto,
  type ReportLineContext,
  type ReportTaskContext,
} from "@/lib/labs/reports/report-task-context";
import {
  formatTestLabel,
  patientKeyFromParts,
  type ReportTask,
} from "@/lib/labs/reports/report-task";
import { isTatBreached } from "@/lib/labs/reports/tat-sla";

export type ReportActionTargets = {
  uploadReportId?: string;
  markReadyReportId?: string;
  sendWhatsappReportId?: string;
  retryDeliveryLogId?: string;
};

export type ReportArtifact = {
  id: string;
  artifactType: string;
  originalFilename: string;
  downloadFilename: string;
  fileSize: number;
  contentType: string;
  isPrimary: boolean;
  version: number;
  uploadedAt: string;
  downloadUrl: string | null;
};

export type ReportDelivery = {
  id: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  retryCount: number;
};

export type ReportHistory = {
  reportId: string;
  supersedesId: string | null;
  supersededById: string | null;
  artifacts: ReportArtifact[];
  deliveryLogs: ReportDelivery[];
};

export type ReportDetail = {
  reportId: string;
  status: string;
  deliveryStatus: string;
  revisionNumber: number;
  readyAt: string | null;
  deliveredAt: string | null;
  patientName: string;
  patientPhone: string;
  encounterId: string | null;
  artifacts: ReportArtifact[];
  delivery: ReportDelivery | null;
  history: {
    supersedesId: string | null;
    supersededById: string | null;
  };
  availableActions: string[];
};

export type ReportSummary = {
  reportId: string;
  patientName: string;
  testLabel: string;
  status: string;
  deliveryStatus: string;
  primaryArtifactFilename: string | null;
  updatedAt: string;
};

function parseTestNames(testLabel: string): string[] {
  const trimmed = testLabel.trim();
  if (!trimmed) return [];
  const moreMatch = /\+ (\d+) more$/.exec(trimmed);
  if (moreMatch) {
    const first = trimmed.replace(/\s*\+\s*\d+\s+more$/, "").trim();
    return first ? [first, `+${moreMatch[1]} more tests`] : [trimmed];
  }
  if (trimmed.includes(" + ")) {
    return trimmed.split(" + ").map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

function slaAnchorFromDto(dto: ReportTaskApiItem): string | null {
  return dto.uploaded_at ?? dto.ready_at ?? dto.delivered_at ?? null;
}

function mapUrgency(raw: string | null | undefined): UrgencyLevel {
  const key = (raw ?? "").trim().toUpperCase();
  if (key === "STAT" || key === "URGENT" || key === "ROUTINE") return key;
  return "ROUTINE";
}

export function mapActionTargetsDto(dto: ReportActionTargetsApi): ReportActionTargets {
  return {
    uploadReportId: dto.upload_report_id ? String(dto.upload_report_id) : undefined,
    markReadyReportId: dto.mark_ready_report_id ? String(dto.mark_ready_report_id) : undefined,
    sendWhatsappReportId: dto.send_whatsapp_report_id
      ? String(dto.send_whatsapp_report_id)
      : undefined,
    retryDeliveryLogId: dto.retry_delivery_log_id
      ? String(dto.retry_delivery_log_id)
      : undefined,
  };
}

export function mapReportTaskDto(dto: ReportTaskApiItem, options?: { labName?: string }): ReportTask {
  const testNames = parseTestNames(dto.test_label);
  const collectionType = dto.collection_type === "VISIT" ? "VISIT" : "HOME";
  const slaAnchorIso = slaAnchorFromDto(dto);
  const urgency = mapUrgency(dto.urgency);
  const collectedLabel = formatRelativeCollected(slaAnchorIso);
  const updatedIso = dto.delivered_at ?? dto.ready_at ?? dto.uploaded_at ?? null;
  const totalReports = Math.max(1, Number(dto.total_reports ?? (testNames.length || 1)));
  const requiredReports = Math.max(1, Number(dto.required_reports ?? totalReports));
  const uploadedReports = Math.max(0, Number(dto.uploaded_reports ?? 0));
  const uploadedRequiredReports = Math.max(0, Number(dto.uploaded_required_reports ?? uploadedReports));
  const deliveredReports = Math.max(0, Number(dto.delivered_reports ?? 0));
  const pendingReports = Math.max(0, Number(dto.pending_reports ?? requiredReports - uploadedRequiredReports));
  const failedReports = Math.max(0, Number(dto.failed_reports ?? 0));
  const orderWorkflowState = (
    dto.order_workflow_state ?? (pendingReports > 0 ? "pending_upload" : "ready_to_send")
  ) as ReportTask["orderWorkflowState"];
  const reason = dto.order_workflow_reason ?? null;

  return {
    taskId: dto.task_id,
    assignmentId: dto.assignment_id,
    orderUuid: dto.order_uuid,
    orderNumber: dto.order_number,
    patientKey: patientKeyFromParts(dto.patient_name, dto.patient_phone),
    patientName: dto.patient_name,
    patientPhone: dto.patient_phone,
    testLabel: dto.test_label || formatTestLabel(testNames),
    testNames,
    collectionType,
    visitOrSlotLabel: dto.visit_or_slot_label || "—",
    collectedAtLabel: collectedLabel,
    updatedAtLabel: formatReportTimestamp(updatedIso, collectedLabel),
    updatedAtIso: updatedIso,
    assignedAtIso: slaAnchorIso,
    createdAtIso: slaAnchorIso,
    operationalStatus: mapApiOperationalStatus(dto.operational_status),
    pendingSiblingCount: dto.pending_sibling_count,
    urgency,
    tatBreached: isTatBreached(slaAnchorIso, urgency),
    labName: options?.labName ?? "",
    reportCount: testNames.length,
    requiredReports,
    uploadedReports,
    uploadedRequiredReports,
    deliveredReports,
    pendingReports,
    failedReports,
    orderWorkflowState,
    orderWorkflowReason: {
      code: String(reason?.code ?? "DERIVED"),
      message: String(reason?.message ?? "Order state derived from report completion."),
    },
    lastReportUploadedAtIso: dto.last_report_uploaded_at ?? dto.uploaded_at ?? null,
    completedAtIso: dto.completed_at ?? null,
    actionTargets: mapActionTargetsDto(dto.available_action_targets),
  };
}

export function mapReportTaskDtos(
  items: ReportTaskApiItem[],
  options?: { labName?: string },
): ReportTask[] {
  return items.map((dto) => mapReportTaskDto(dto, options));
}

export { mapReportTaskContextDto };

export function mapReportArtifactDto(dto: ReportArtifactApiItem): ReportArtifact {
  return {
    id: String(dto.id),
    artifactType: dto.artifact_type,
    originalFilename: dto.original_filename,
    downloadFilename: dto.download_filename,
    fileSize: dto.file_size,
    contentType: dto.content_type,
    isPrimary: dto.is_primary,
    version: dto.version,
    uploadedAt: dto.uploaded_at,
    downloadUrl: dto.download_url,
  };
}

export function mapDeliveryDto(dto: DeliveryLogApiItem): ReportDelivery {
  return {
    id: String(dto.id),
    status: dto.status,
    sentAt: dto.sent_at,
    deliveredAt: dto.delivered_at,
    failureReason: dto.failure_reason,
    retryCount: dto.retry_count,
  };
}

export function mapReportDetailDto(dto: ReportDetailApiData): ReportDetail {
  return {
    reportId: String(dto.report.id),
    status: dto.report.status,
    deliveryStatus: dto.report.delivery_status,
    revisionNumber: dto.report.revision_number,
    readyAt: dto.report.ready_at,
    deliveredAt: dto.report.delivered_at,
    patientName: dto.patient.name,
    patientPhone: dto.patient.phone,
    encounterId: dto.patient.encounter_id,
    artifacts: dto.artifacts.map(mapReportArtifactDto),
    delivery: dto.delivery ? mapDeliveryDto(dto.delivery) : null,
    history: {
      supersedesId: dto.history.supersedes_id,
      supersededById: dto.history.superseded_by_id,
    },
    availableActions: dto.available_actions ?? [],
  };
}

export function mapReportHistoryDto(dto: ReportHistoryApiData): ReportHistory {
  return {
    reportId: String(dto.report_id),
    supersedesId: dto.supersedes_id ? String(dto.supersedes_id) : null,
    supersededById: dto.superseded_by_id ? String(dto.superseded_by_id) : null,
    artifacts: dto.artifacts.map(mapReportArtifactDto),
    deliveryLogs: dto.delivery_logs.map(mapDeliveryDto),
  };
}

export function mapReportSummaryDto(dto: ReportSummaryApiItem): ReportSummary {
  return {
    reportId: String(dto.report_id),
    patientName: dto.patient_name,
    testLabel: dto.test_label,
    status: dto.status,
    deliveryStatus: dto.delivery_status,
    primaryArtifactFilename: dto.primary_artifact_filename,
    updatedAt: dto.updated_at,
  };
}

/** Upload page: prefer backend upload_target when present. */
export function resolveUploadReportId(ctx: ReportTaskContext): string | undefined {
  if (ctx.uploadTarget?.reportId) return ctx.uploadTarget.reportId;
  const line = ctx.activeReports.find((r) =>
    r.availableActions.includes("UPLOAD_REPORT"),
  );
  return line?.reportId ?? ctx.activeReports[0]?.reportId;
}

export function mapLifecycleStatusToOperational(status: string): ReportOperationalStatus {
  const key = status.trim().toLowerCase();
  if (key === "ready") return "READY_DELIVERY";
  if (key === "in_progress") return "UPLOADED";
  if (key === "delivered") return "DELIVERED";
  if (key === "rejected") return "FAILED_DELIVERY";
  return "PENDING_UPLOAD";
}

export type { ReportLineContext, ReportTaskContext };
