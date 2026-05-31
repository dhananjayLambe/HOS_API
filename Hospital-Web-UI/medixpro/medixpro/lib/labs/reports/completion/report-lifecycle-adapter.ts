import { resolveChipAvailableActions } from "@/lib/labs/reports/completion/action-fallback";
import { recomputeOrderDerived } from "@/lib/labs/reports/completion/next-action-engine";
import {
  inferArtifactType,
  isReportSent,
} from "@/lib/labs/reports/completion/operational-contract";
import type {
  DeliveryFailure,
  LastActivity,
  OrderLifecycleViewModel,
  ReportArtifactViewModel,
  ReportChipStatus,
  ReportChipViewModel,
  ReportDeliveryState,
  TatState,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import type {
  ReportArtifact,
  ReportDetail,
  ReportHistory,
} from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportLineContext, ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import { formatReportTimestamp } from "@/lib/labs/reports/format-report-timestamp";

function toInlinePreviewUrl(downloadUrl: string | null): string | undefined {
  if (!downloadUrl) return undefined;
  try {
    const parsed = new URL(downloadUrl, globalThis?.location?.origin ?? "http://localhost");
    parsed.searchParams.set("inline", "1");
    return parsed.toString();
  } catch {
    const joiner = downloadUrl.includes("?") ? "&" : "?";
    return `${downloadUrl}${joiner}inline=1`;
  }
}

function lifecycleStatusFromApi(status: string, deliveryStatus: string): ReportChipStatus {
  const raw = status.trim().toLowerCase();
  const delivery = deliveryStatus.trim().toLowerCase();
  if (delivery === "failed" || raw === "failed_delivery") return "failed_delivery";
  if (raw === "failed_upload") return "failed_upload";
  if (raw === "rejected") return "rejected";
  if (raw === "corrected") return "corrected";
  if (
    delivery === "sent" ||
    delivery === "delivered" ||
    delivery === "viewed" ||
    raw === "sent" ||
    raw === "delivered"
  ) {
    return "sent";
  }
  if (raw === "ready") return "ready";
  if (raw === "uploaded" || raw === "in_progress") return "uploaded";
  return "pending";
}

function deliveryStateFromApi(deliveryStatus: string): ReportDeliveryState {
  const raw = deliveryStatus.trim().toLowerCase();
  if (raw === "failed") return "failed";
  if (raw === "viewed") return "viewed";
  if (raw === "delivered") return "delivered";
  if (raw === "sent" || raw === "queued") return "sent";
  return "not_sent";
}

function artifactViewModel(artifact: ReportArtifact): ReportArtifactViewModel {
  const artifactType = inferArtifactType(artifact.originalFilename, artifact.contentType);
  return {
    id: artifact.id,
    fileName: artifact.originalFilename,
    mimeType: artifact.contentType,
    artifactType,
    isPrimary: artifact.isPrimary,
    patientVisible: artifact.isPrimary || artifactType === "PRIMARY_REPORT",
    uploadedAtLabel: artifact.uploadedAt ? formatReportTimestamp(artifact.uploadedAt, "") : undefined,
    versionNumber: artifact.version,
    previewUrl: toInlinePreviewUrl(artifact.downloadUrl),
    downloadUrl: artifact.downloadUrl ?? undefined,
  };
}

function buildReportChip(
  line: ReportLineContext,
  detail?: ReportDetail,
  history?: ReportHistory,
): ReportChipViewModel {
  const status = lifecycleStatusFromApi(detail?.status ?? line.status, detail?.deliveryStatus ?? line.deliveryStatus);
  const deliveryState = deliveryStateFromApi(detail?.deliveryStatus ?? line.deliveryStatus);
  const artifacts = (detail?.artifacts ?? []).map(artifactViewModel);
  const latestVersionNumber = detail?.revisionNumber ?? artifacts.reduce((max, a) => Math.max(max, a.versionNumber ?? 0), 0);
  const isCorrected =
    status === "corrected" ||
    Boolean(detail?.history.supersedesId || detail?.history.supersededById || history?.supersedesId || history?.supersededById);
  const versionId = latestVersionNumber > 0 ? `${line.reportId}-v${latestVersionNumber}` : undefined;

  return {
    reportId: line.reportId,
    testLabel: line.testLabel,
    status: isCorrected && status === "sent" ? "sent" : status,
    deliveryState,
    artifacts,
    versions:
      latestVersionNumber > 0
        ? [
            {
              versionId: versionId ?? `${line.reportId}-v1`,
              versionNumber: latestVersionNumber,
              label: `v${latestVersionNumber}${isCorrected ? " Corrected" : " Latest"}`,
              isLatest: true,
              isCorrected,
              status,
              deliveryState,
              artifacts,
            },
          ]
        : [],
    latestVersionId: versionId,
    lastUpdatedAtLabel: detail?.readyAt ? formatReportTimestamp(detail.readyAt, "") : undefined,
    availableActions: resolveChipAvailableActions(line.availableActions, {}),
  };
}

export function buildOrderLifecycleFromTaskContext(
  context: ReportTaskContext,
  options: {
    detailsByReportId?: Record<string, ReportDetail | undefined>;
    historiesByReportId?: Record<string, ReportHistory | undefined>;
    tatState?: TatState;
    tatLabel?: string;
    urgency?: OrderLifecycleViewModel["urgency"];
    lastActivity?: LastActivity;
    deliveryFailure?: DeliveryFailure;
  } = {},
): OrderLifecycleViewModel {
  const reports = context.activeReports.map((line) =>
    buildReportChip(line, options.detailsByReportId?.[line.reportId], options.historiesByReportId?.[line.reportId]),
  );
  const anySent = reports.some(isReportSent);
  const base: OrderLifecycleViewModel = {
    taskId: context.taskId,
    orderNumber: context.orderNumber,
    patientKey: `phone:${context.patientPhone.replace(/\D/g, "") || context.patientName.toLowerCase()}`,
    patientName: context.patientName,
    patientPhone: context.patientPhone,
    tatState: options.tatState ?? "safe",
    tatLabel: options.tatLabel ?? "TAT on track",
    urgency: options.urgency ?? "ROUTINE",
    reports,
    nextAction: { line: "", showSendAvailable: false, showUpload: false, readyReportIds: [] },
    deliveryFailure: options.deliveryFailure,
    lastActivity: options.lastActivity ?? { atLabel: anySent ? "recently" : "not started", byName: "System" },
    attentionReasons: [],
    isFullyComplete: false,
    readyToSendCount: 0,
    hasPendingUpload: false,
  };

  return recomputeOrderDerived(base);
}
