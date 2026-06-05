"use client";

import { OrderCompletionCard } from "@/components/labs/reports/completion/OrderCompletionCard";
import { ReportsWorkflowTaskRow } from "@/components/labs/reports/ReportsWorkflowTaskRow";
import { useReportTaskContext } from "@/hooks/labs/useReportTaskContext";
import { fallbackOrderFromTask } from "@/lib/labs/reports/completion/fallback-order-from-task";
import { buildOrderLifecycleFromTaskContext } from "@/lib/labs/reports/completion/report-lifecycle-adapter";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { useMemo } from "react";

export type ReportsAssignmentLiveCardActions = {
  onPrimaryAction: (task: ReportTask, actionKey: string) => void;
  onPreview: (task: ReportTask, reportId: string) => void;
  onViewOrder: (task: ReportTask) => void;
  onUpload: (task: ReportTask, reportId?: string) => void;
  onMarkReady: (task: ReportTask, reportId: string) => void;
  onSend: (task: ReportTask, reportIds: string[]) => void;
  onReupload: (task: ReportTask, reportId: string) => void;
  onRetry: (task: ReportTask) => void;
};

type ReportsAssignmentLiveCardProps = {
  task: ReportTask;
  /** Fetch per-order test lines when the patient group is expanded. */
  contextEnabled: boolean;
  actionLoading?: string | null;
  actions: ReportsAssignmentLiveCardActions;
};

export { fallbackOrderFromTask };

export function ReportsAssignmentLiveCard({
  task,
  contextEnabled,
  actionLoading,
  actions,
}: ReportsAssignmentLiveCardProps) {
  const { data: session } = useLabSession();
  const branchId = session?.branch?.id ?? null;
  const contextQuery = useReportTaskContext(branchId, task.taskId, contextEnabled);

  const order = useMemo((): OrderLifecycleViewModel => {
    if (contextQuery.data?.activeReports.length) {
      const derived = buildOrderLifecycleFromTaskContext(contextQuery.data, {
        urgency: task.urgency,
        tatState: task.tatBreached ? "breached" : "safe",
        tatLabel: task.tatBreached ? "TAT breached" : "TAT on track",
      });
      return {
        ...derived,
        orderWorkflowState: task.orderWorkflowState,
        orderWorkflowReason: task.orderWorkflowReason,
        requiredReports: task.requiredReports,
        uploadedRequiredReports: task.uploadedRequiredReports,
        totalReports: task.totalReports,
        uploadedReports: task.uploadedReports,
        deliveredReports: task.deliveredReports,
        pendingReports: task.pendingReports,
        failedReports: task.failedReports,
        completedAtIso: task.completedAtIso,
        lastReportUploadedAtIso: task.lastReportUploadedAtIso,
        isFullyComplete: task.orderWorkflowState === "delivered",
        hasPendingUpload:
          task.orderWorkflowState === "pending_upload" ||
          task.orderWorkflowState === "partial_upload",
        readyToSendCount:
          task.orderWorkflowState === "ready_to_send" ? task.requiredReports : 0,
      };
    }
    return fallbackOrderFromTask(task);
  }, [contextQuery.data, task]);

  const loadingKeyPrefix = `${task.taskId}:`;
  const isCardLoading = Boolean(actionLoading?.startsWith(loadingKeyPrefix));

  if (!contextEnabled) {
    return null;
  }

  if (contextQuery.isPending && !contextQuery.data) {
    return <div className="h-16 animate-pulse rounded-md border border-[#ECEBFF] bg-white/80" aria-hidden />;
  }

  if (contextQuery.isError && !contextQuery.data?.activeReports.length) {
    return (
      <ReportsWorkflowTaskRow
        task={task}
        actionLoading={actionLoading}
        onPrimaryAction={(key) => actions.onPrimaryAction(task, key)}
        onPreview={() => {
          const reportId =
            task.actionTargets.markReadyReportId ??
            task.actionTargets.uploadReportId ??
            task.actionTargets.sendWhatsappReportId;
          if (reportId) actions.onPreview(task, reportId);
        }}
        onViewOrder={() => actions.onViewOrder(task)}
      />
    );
  }

  return (
    <OrderCompletionCard
      order={order}
      branchId={branchId}
      hidePatientName
      actionLoading={isCardLoading}
      onUpload={(reportId) => actions.onUpload(task, reportId)}
      onSendAvailable={(reportIds) => actions.onSend(task, reportIds ?? [])}
      onRetry={() => actions.onRetry(task)}
      onReupload={(reportId) => actions.onReupload(task, reportId)}
      onPreview={(reportId) => actions.onPreview(task, reportId)}
      onDismissToast={() => undefined}
    />
  );
}
