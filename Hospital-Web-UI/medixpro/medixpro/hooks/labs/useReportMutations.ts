"use client";

import {
  extractReportApiErrorCode,
  extractReportRequestId,
  isOperationalConflictCode,
  mapReportApiErrorToMessage,
} from "@/lib/labs/reports/api/report-api-errors";
import { newReportRequestId } from "@/lib/labs/reports/api/report-api-response";
import {
  markReportReady,
  retryDelivery,
  uploadReportArtifacts,
} from "@/lib/labs/reports/api/v1/reports-api";
import {
  mapLifecycleStatusToOperational,
  type ReportDetail,
} from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { LabOrderRow } from "@/lib/labs/types";
import {
  labOrderAssignmentQueryKey,
  reportDetailQueryKey,
  reportHistoryQueryKey,
  reportTaskContextQueryKey,
  reportsQueueKeyPrefix,
} from "@/lib/labs/reports/query-keys";
import { sendTaskWhatsAppMock } from "@/lib/labs/reports/mock-report-delivery";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import { trackReportEvent } from "@/lib/labs/reports/report-monitoring";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

export type OperationalConflictContext = {
  taskId?: string;
  reportId?: string;
  assignmentId?: string;
  onConflict?: () => void;
};

export type UploadReportInput = {
  reportId: string;
  files: File[];
  primaryFileIndex: number;
  notes?: string;
  version?: number;
  requestId?: string;
  /** Refreshes open View order drawer + queue after upload. */
  taskId?: string;
  assignmentId?: string;
};

export type UploadReportResult = {
  reportId: string;
  status: ReportOperationalStatus;
  requestId: string;
};

export function useReportMutations(branchId: string | null | undefined) {
  const queryClient = useQueryClient();
  const inFlightUploadIds = useRef(new Set<string>());

  const invalidateReportsQueue = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: reportsQueueKeyPrefix(branchId ?? null),
    });
  }, [queryClient, branchId]);

  const invalidateReportDetail = useCallback(
    async (reportId: string | undefined) => {
      if (!reportId) return;
      await queryClient.invalidateQueries({
        queryKey: reportDetailQueryKey(branchId ?? null, reportId),
      });
    },
    [queryClient, branchId],
  );

  const invalidateTaskContext = useCallback(
    async (taskId: string | undefined) => {
      if (!taskId) return;
      await queryClient.invalidateQueries({
        queryKey: reportTaskContextQueryKey(branchId ?? null, taskId),
      });
    },
    [queryClient, branchId],
  );

  const invalidateReportHistory = useCallback(
    async (reportId: string | undefined) => {
      if (!reportId) return;
      await queryClient.invalidateQueries({
        queryKey: reportHistoryQueryKey(branchId ?? null, reportId),
      });
    },
    [queryClient, branchId],
  );

  const invalidateLabOrderAssignment = useCallback(
    async (assignmentId: string | undefined) => {
      if (!assignmentId) return;
      await queryClient.invalidateQueries({
        queryKey: labOrderAssignmentQueryKey(branchId ?? null, assignmentId),
      });
    },
    [queryClient, branchId],
  );

  const syncDrawerAfterReportLifecycleChange = useCallback(
    async (params: {
      reportId: string;
      responseReportId?: string;
      lifecycleStatus?: string;
      taskId?: string;
      assignmentId?: string;
    }) => {
      const reportIds = [
        ...new Set(
          [params.reportId, params.responseReportId].filter((id): id is string => !!id),
        ),
      ];
      const status = params.lifecycleStatus;

      if (status) {
        for (const id of reportIds) {
          queryClient.setQueryData<ReportDetail>(
            reportDetailQueryKey(branchId ?? null, id),
            (old) => (old ? { ...old, status } : old),
          );
        }
        if (params.assignmentId) {
          queryClient.setQueryData<LabOrderRow>(
            labOrderAssignmentQueryKey(branchId ?? null, params.assignmentId),
            (old) => (old ? { ...old, reportStatus: status } : old),
          );
        }
      }

      await invalidateReportsQueue();
      for (const id of reportIds) {
        await invalidateReportDetail(id);
        await invalidateReportHistory(id);
      }
      await invalidateTaskContext(params.taskId);
      await invalidateLabOrderAssignment(params.assignmentId);
    },
    [
      branchId,
      queryClient,
      invalidateReportsQueue,
      invalidateReportDetail,
      invalidateReportHistory,
      invalidateTaskContext,
      invalidateLabOrderAssignment,
    ],
  );

  const refreshDrawerReports = useCallback(
    async (ctx: { taskId?: string; reportId?: string; assignmentId?: string }) => {
      await invalidateTaskContext(ctx.taskId);
      await invalidateReportDetail(ctx.reportId);
      await invalidateReportHistory(ctx.reportId);
      await invalidateLabOrderAssignment(ctx.assignmentId);
    },
    [
      invalidateTaskContext,
      invalidateReportDetail,
      invalidateReportHistory,
      invalidateLabOrderAssignment,
    ],
  );

  const handleOperationalConflict = useCallback(
    async (error: unknown, ctx: OperationalConflictContext = {}) => {
      const code = extractReportApiErrorCode(error);
      if (!isOperationalConflictCode(code)) return false;
      await invalidateReportsQueue();
      await invalidateTaskContext(ctx.taskId);
      await invalidateReportDetail(ctx.reportId);
      await invalidateReportHistory(ctx.reportId);
      await invalidateLabOrderAssignment(ctx.assignmentId);
      ctx.onConflict?.();
      return true;
    },
    [
      invalidateReportsQueue,
      invalidateTaskContext,
      invalidateReportDetail,
      invalidateReportHistory,
      invalidateLabOrderAssignment,
    ],
  );

  const uploadReport = useCallback(
    async (input: UploadReportInput): Promise<UploadReportResult> => {
      const requestId = input.requestId ?? newReportRequestId();
      if (inFlightUploadIds.current.has(requestId)) {
        throw new Error("Upload already in progress.");
      }
      inFlightUploadIds.current.add(requestId);
      const started = Date.now();
      try {
        const formData = new FormData();
        for (const file of input.files) {
          formData.append("files", file);
        }
        formData.append("primary_file_index", String(input.primaryFileIndex));
        if (input.notes) formData.append("notes", input.notes);
        if (input.version != null) formData.append("version", String(input.version));

        const data = await uploadReportArtifacts(input.reportId, formData, { requestId });
        const effectiveReportId = data.report_id ? String(data.report_id) : input.reportId;
        trackReportEvent("upload_duration", {
          reportId: effectiveReportId,
          requestId,
          durationMs: Date.now() - started,
        });
        await syncDrawerAfterReportLifecycleChange({
          reportId: input.reportId,
          responseReportId:
            effectiveReportId !== input.reportId ? effectiveReportId : undefined,
          lifecycleStatus: data.status,
          taskId: input.taskId,
          assignmentId: input.assignmentId,
        });
        return {
          reportId: effectiveReportId,
          status: mapLifecycleStatusToOperational(data.status),
          requestId,
        };
      } catch (error) {
        trackReportEvent("upload_fail", {
          reportId: input.reportId,
          requestId: extractReportRequestId(error) ?? requestId,
          errorCode: extractReportApiErrorCode(error),
        });
        throw error;
      } finally {
        inFlightUploadIds.current.delete(requestId);
      }
    },
    [syncDrawerAfterReportLifecycleChange],
  );

  const markReady = useCallback(
    async (reportId: string, ctx: OperationalConflictContext = {}) => {
      const requestId = newReportRequestId();
      try {
        const data = await markReportReady(reportId, undefined, { requestId });
        await syncDrawerAfterReportLifecycleChange({
          reportId,
          lifecycleStatus: data.status,
          taskId: ctx.taskId,
          assignmentId: ctx.assignmentId,
        });
      } catch (error) {
        const conflict = await handleOperationalConflict(error, { ...ctx, reportId });
        if (conflict) throw Object.assign(error, { operationalConflict: true });
        trackReportEvent("mark_ready_fail", {
          reportId,
          requestId,
          errorCode: extractReportApiErrorCode(error),
        });
        throw error;
      }
    },
    [handleOperationalConflict, syncDrawerAfterReportLifecycleChange],
  );

  const retryDeliveryMutation = useCallback(
    async (logId: string, ctx: OperationalConflictContext = {}) => {
      const requestId = newReportRequestId();
      try {
        await retryDelivery(logId, { requestId });
        await invalidateReportsQueue();
        if (ctx.reportId) {
          await invalidateReportDetail(ctx.reportId);
          await invalidateReportHistory(ctx.reportId);
        }
        await invalidateLabOrderAssignment(ctx.assignmentId);
      } catch (error) {
        trackReportEvent("retry_fail", {
          requestId,
          errorCode: extractReportApiErrorCode(error),
        });
        const conflict = await handleOperationalConflict(error, ctx);
        if (conflict) throw Object.assign(error, { operationalConflict: true });
        throw error;
      }
    },
    [
      handleOperationalConflict,
      invalidateReportsQueue,
      invalidateReportDetail,
      invalidateReportHistory,
      invalidateLabOrderAssignment,
    ],
  );

  const sendWhatsAppMock = useCallback(
    async (taskId: string, reportId?: string) => {
      await sendTaskWhatsAppMock(taskId);
      await invalidateReportsQueue();
      if (reportId) await invalidateReportDetail(reportId);
    },
    [invalidateReportsQueue, invalidateReportDetail],
  );

  return {
    uploadReport,
    markReady,
    retryDelivery: retryDeliveryMutation,
    sendWhatsAppMock,
    invalidateReportsQueue,
    invalidateReportDetail,
    invalidateReportHistory,
    invalidateLabOrderAssignment,
    invalidateTaskContext,
    refreshDrawerReports,
    handleOperationalConflict,
    mapReportApiErrorToMessage,
  };
}
