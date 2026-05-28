import { recomputeOrderDerived } from "@/lib/labs/reports/completion/next-action-engine";
import { resolveChipAvailableActions } from "@/lib/labs/reports/completion/action-fallback";
import type {
  OrderLifecycleViewModel,
  ReportChipViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import type { ReportTask } from "@/lib/labs/reports/report-task";

/** Queue-row stub view model before per-assignment context hydrates. */
export function fallbackOrderFromTask(task: ReportTask): OrderLifecycleViewModel {
  const targets = task.actionTargets;
  const hasUpload = Boolean(targets.uploadReportId);
  const hasMarkReady = Boolean(targets.markReadyReportId);
  const hasSend = Boolean(targets.sendWhatsappReportId);
  const hasRetry = Boolean(targets.retryDeliveryLogId);
  const reportId =
    targets.sendWhatsappReportId ??
    targets.markReadyReportId ??
    targets.uploadReportId ??
    task.taskId;

  const isDelivered = task.operationalStatus === "DELIVERED";
  const availableActions = resolveChipAvailableActions(
    isDelivered ? ["CORRECT_REPORT", "VIEW_REPORT", "DOWNLOAD_REPORT"] : undefined,
    targets,
  );

  const status: ReportChipViewModel["status"] = hasUpload
    ? "pending"
    : isDelivered
      ? "sent"
      : hasMarkReady || hasSend
        ? "ready"
        : hasRetry
          ? "failed_delivery"
          : "sent";
  const deliveryState: ReportChipViewModel["deliveryState"] = hasRetry
    ? "failed"
    : isDelivered
      ? "sent"
      : hasSend || hasMarkReady
        ? "not_sent"
        : "sent";

  const report: ReportChipViewModel = {
    reportId,
    testLabel: task.testLabel,
    status,
    deliveryState,
    artifacts: [],
    versions: [],
    availableActions,
    lastUpdatedLabel: task.updatedAtLabel,
  };

  const base: OrderLifecycleViewModel = {
    taskId: task.taskId,
    orderNumber: task.orderNumber,
    patientKey: task.patientKey,
    patientName: task.patientName,
    patientPhone: task.patientPhone,
    tatState: task.tatBreached ? "breached" : "safe",
    tatLabel: task.tatBreached ? "TAT breached" : "TAT on track",
    urgency: task.urgency,
    reports: [report],
    nextAction: { line: "", showSendAvailable: false, showUpload: false, readyReportIds: [] },
    lastActivity: { atLabel: task.updatedAtLabel, byName: "System" },
    operationalUpdatedAtIso: task.updatedAtIso ?? task.assignedAtIso,
    slaAnchorIso: task.assignedAtIso,
    tatBreached: task.tatBreached,
    attentionReasons: [],
    isFullyComplete: status === "sent" && !hasRetry,
    readyToSendCount: hasSend || hasMarkReady ? 1 : 0,
    hasPendingUpload: hasUpload,
  };

  return recomputeOrderDerived(base);
}
