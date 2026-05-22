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
import { mapLifecycleStatusToOperational } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import {
  reportDetailQueryKey,
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
  onConflict?: () => void;
};

export type UploadReportInput = {
  reportId: string;
  files: File[];
  primaryFileIndex: number;
  notes?: string;
  version?: number;
  requestId?: string;
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

  const handleOperationalConflict = useCallback(
    async (error: unknown, ctx: OperationalConflictContext = {}) => {
      const code = extractReportApiErrorCode(error);
      if (!isOperationalConflictCode(code)) return false;
      await invalidateReportsQueue();
      await invalidateTaskContext(ctx.taskId);
      await invalidateReportDetail(ctx.reportId);
      ctx.onConflict?.();
      return true;
    },
    [invalidateReportsQueue, invalidateTaskContext, invalidateReportDetail],
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
        trackReportEvent("upload_duration", {
          reportId: input.reportId,
          requestId,
          durationMs: Date.now() - started,
        });
        await invalidateReportsQueue();
        await invalidateReportDetail(input.reportId);
        return {
          reportId: data.report_id,
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
    [invalidateReportsQueue, invalidateReportDetail],
  );

  const markReady = useCallback(
    async (reportId: string, ctx: OperationalConflictContext = {}) => {
      const requestId = newReportRequestId();
      try {
        await markReportReady(reportId, undefined, { requestId });
        await invalidateReportsQueue();
        await invalidateReportDetail(reportId);
        await invalidateTaskContext(ctx.taskId);
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
    [
      handleOperationalConflict,
      invalidateReportsQueue,
      invalidateReportDetail,
      invalidateTaskContext,
    ],
  );

  const retryDeliveryMutation = useCallback(
    async (logId: string, ctx: OperationalConflictContext = {}) => {
      const requestId = newReportRequestId();
      try {
        await retryDelivery(logId, { requestId });
        await invalidateReportsQueue();
        if (ctx.reportId) await invalidateReportDetail(ctx.reportId);
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
    [handleOperationalConflict, invalidateReportsQueue, invalidateReportDetail],
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
    invalidateTaskContext,
    handleOperationalConflict,
    mapReportApiErrorToMessage,
  };
}
