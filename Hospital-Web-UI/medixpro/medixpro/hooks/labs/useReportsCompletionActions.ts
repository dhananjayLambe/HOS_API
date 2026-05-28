"use client";

import { useReportMutations } from "@/hooks/labs/useReportMutations";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { mapReportApiErrorToMessage } from "@/lib/labs/reports/api/report-api-errors";
import { buildSendWhatsAppPayload } from "@/lib/labs/reports/build-send-whatsapp-payload";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { useCallback } from "react";

export type ReportsCompletionDrawerHandlers = {
  openUploadDrawer: (
    task: ReportTask,
    options?: { reportId?: string; mode?: "upload" | "reupload" },
  ) => void;
};

export function useReportsCompletionActions(branchId: string | null | undefined) {
  const mutations = useReportMutations(branchId);
  const toast = useToastNotification();

  const runAction = useCallback(
    async (
      task: ReportTask,
      key: string,
      fn: () => Promise<void>,
      successMsg: string,
      setActionLoading: (id: string | null) => void,
    ) => {
      setActionLoading(`${task.taskId}:${key}`);
      try {
        await fn();
        toast.success(successMsg);
      } catch (err) {
        await mutations.handleOperationalConflict(err, {
          taskId: task.taskId,
          assignmentId: task.assignmentId,
          reportId:
            task.actionTargets.sendWhatsappReportId ??
            task.actionTargets.markReadyReportId ??
            task.actionTargets.uploadReportId,
        });
        toast.error(mapReportApiErrorToMessage(err));
      } finally {
        setActionLoading(null);
      }
    },
    [mutations, toast],
  );

  const sendWhatsAppForTask = useCallback(
    (task: ReportTask, reportId: string) => {
      const built = buildSendWhatsAppPayload(task.patientPhone);
      if (!built.ok) {
        toast.error(built.error);
        return Promise.resolve();
      }
      return mutations.sendWhatsAppMock(reportId, built.payload, {
        taskId: task.taskId,
        reportId,
        assignmentId: task.assignmentId,
      });
    },
    [mutations, toast],
  );

  const buildLiveCardActions = useCallback(
    (
      setActionLoading: (id: string | null) => void,
      drawer?: ReportsCompletionDrawerHandlers,
    ) => ({
      onPrimaryAction: (task: ReportTask, actionKey: string) => {
        const targets = task.actionTargets;
        switch (actionKey) {
          case "upload":
            drawer?.openUploadDrawer(task, {
              reportId: targets.uploadReportId,
              mode: "upload",
            });
            break;
          case "wa":
          case "resend": {
            const reportId = targets.sendWhatsappReportId;
            if (!reportId) {
              toast.error("Action no longer available — refresh the queue.");
              return;
            }
            void runAction(
              task,
              actionKey,
              () => sendWhatsAppForTask(task, reportId),
              actionKey === "wa" ? "WhatsApp delivery queued" : "Report resent",
              setActionLoading,
            );
            break;
          }
          case "retry": {
            const logId = targets.retryDeliveryLogId;
            if (!logId) {
              toast.error("Action no longer available — refresh the queue.");
              return;
            }
            void runAction(
              task,
              "retry",
              () =>
                mutations.retryDelivery(logId, {
                  taskId: task.taskId,
                  assignmentId: task.assignmentId,
                  reportId: targets.sendWhatsappReportId ?? targets.markReadyReportId,
                }),
              "Delivery retry queued",
              setActionLoading,
            );
            break;
          }
          default:
            break;
        }
      },
      onPreview: (_task: ReportTask, _reportId: string) => {
        /* handled by completion page state */
      },
      onViewOrder: (task: ReportTask) => {
        drawer?.openUploadDrawer(task, { mode: "upload" });
      },
      onUpload: (task: ReportTask, reportId?: string) => {
        drawer?.openUploadDrawer(task, {
          reportId: reportId ?? task.actionTargets.uploadReportId,
          mode: "upload",
        });
      },
      onMarkReady: () => {
        /* Phase 1: Mark Ready hidden from operator surface */
      },
      onSend: (task: ReportTask, reportIds: string[]) => {
        const reportId = reportIds[0] ?? task.actionTargets.sendWhatsappReportId;
        if (!reportId) {
          toast.error("Action no longer available — refresh the queue.");
          return;
        }
        void runAction(
          task,
          "wa",
          () => sendWhatsAppForTask(task, reportId),
          "Report sent",
          setActionLoading,
        );
      },
      onReupload: (task: ReportTask, reportId: string) => {
        drawer?.openUploadDrawer(task, { reportId, mode: "reupload" });
      },
      onRetry: (task: ReportTask) => {
        const logId = task.actionTargets.retryDeliveryLogId;
        if (!logId) {
          toast.error("Action no longer available — refresh the queue.");
          return;
        }
        void runAction(
          task,
          "retry",
          () =>
            mutations.retryDelivery(logId, {
              taskId: task.taskId,
              assignmentId: task.assignmentId,
              reportId: task.actionTargets.sendWhatsappReportId,
            }),
          "Delivery retry queued",
          setActionLoading,
        );
      },
    }),
    [mutations, runAction, sendWhatsAppForTask, toast],
  );

  return {
    mutations,
    buildLiveCardActions,
    runAction,
  };
}
