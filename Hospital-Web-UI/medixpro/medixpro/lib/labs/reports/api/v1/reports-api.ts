"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type { DiagnosticsApiEnvelope } from "@/lib/labs/reports/api/report-api-response";
import {
  newReportRequestId,
  unwrapApiResponse,
} from "@/lib/labs/reports/api/report-api-response";
import type {
  MarkReadyApiData,
  ReportDetailApiData,
  ReportHistoryApiData,
  ReportSummaryListData,
  ReportTaskContextApiData,
  ReportTaskListData,
  ReportTasksListQueryParams,
  RetryDeliveryApiData,
  SendWhatsAppApiData,
  UploadArtifactsApiData,
} from "@/lib/labs/reports/api/report-api-types";

const V1_PREFIX = "v1/diagnostics";

function requestHeaders(
  requestId?: string,
  idempotencyKey?: string,
): Record<string, string> {
  const id = requestId ?? newReportRequestId();
  const headers: Record<string, string> = { "X-Request-ID": id };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

export type ReportDownloadApiData = {
  download_url: string | null;
  expires_in: number;
  filename: string;
  artifact_id: string;
};

export async function getReportsQueue(
  params: ReportTasksListQueryParams,
  options?: { signal?: AbortSignal; requestId?: string },
): Promise<ReportTaskListData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportTaskListData>>(
    `${V1_PREFIX}/report-tasks/`,
    {
      params,
      signal: options?.signal,
      headers: requestHeaders(options?.requestId),
    },
  );
  return unwrapApiResponse(data);
}

export async function getReportTaskContext(
  taskId: string,
  options?: { signal?: AbortSignal; requestId?: string },
): Promise<ReportTaskContextApiData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportTaskContextApiData>>(
    `${V1_PREFIX}/report-tasks/${encodeURIComponent(taskId)}/`,
    { signal: options?.signal, headers: requestHeaders(options?.requestId) },
  );
  return unwrapApiResponse(data);
}

export async function getReportDetail(
  reportId: string,
  options?: { signal?: AbortSignal; requestId?: string },
): Promise<ReportDetailApiData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportDetailApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/`,
    { signal: options?.signal, headers: requestHeaders(options?.requestId) },
  );
  return unwrapApiResponse(data);
}

export async function getReportHistory(
  reportId: string,
  options?: { signal?: AbortSignal; requestId?: string },
): Promise<ReportHistoryApiData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportHistoryApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/history/`,
    { signal: options?.signal, headers: requestHeaders(options?.requestId) },
  );
  return unwrapApiResponse(data);
}

export async function getPatientReports(
  patientId: string,
  params?: Record<string, string | number>,
  options?: { signal?: AbortSignal },
): Promise<ReportSummaryListData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportSummaryListData>>(
    `${V1_PREFIX}/patients/${encodeURIComponent(patientId)}/reports/`,
    { params, signal: options?.signal, headers: requestHeaders() },
  );
  return unwrapApiResponse(data);
}

export async function getEncounterReports(
  encounterId: string,
  params?: Record<string, string | number>,
  options?: { signal?: AbortSignal },
): Promise<ReportSummaryListData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportSummaryListData>>(
    `${V1_PREFIX}/encounters/${encodeURIComponent(encounterId)}/reports/`,
    { params, signal: options?.signal, headers: requestHeaders() },
  );
  return unwrapApiResponse(data);
}

export async function uploadReportArtifacts(
  reportId: string,
  formData: FormData,
  options?: {
    requestId?: string;
    onUploadProgress?: (percent: number) => void;
  },
): Promise<UploadArtifactsApiData> {
  const { data } = await backendAxiosClient.post<DiagnosticsApiEnvelope<UploadArtifactsApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/artifacts/upload/`,
    formData,
    {
      headers: {
        ...requestHeaders(options?.requestId),
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: options?.onUploadProgress
        ? (event) => {
            const total = event.total ?? 0;
            if (total > 0) {
              options.onUploadProgress?.(Math.round((event.loaded / total) * 100));
            }
          }
        : undefined,
    },
  );
  return unwrapApiResponse(data);
}

export async function getReportDownloadUrl(
  reportId: string,
  options?: { signal?: AbortSignal; requestId?: string; stream?: boolean },
): Promise<ReportDownloadApiData> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<ReportDownloadApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/download/`,
    {
      params: options?.stream ? { stream: "1" } : undefined,
      signal: options?.signal,
      headers: requestHeaders(options?.requestId),
      responseType: options?.stream ? "blob" : "json",
    },
  );
  if (options?.stream) {
    return {
      download_url: URL.createObjectURL(data as unknown as Blob),
      expires_in: 0,
      filename: "report.pdf",
      artifact_id: reportId,
    };
  }
  return unwrapApiResponse(data as DiagnosticsApiEnvelope<ReportDownloadApiData>);
}

export async function markReportReady(
  reportId: string,
  body?: { notes?: string },
  options?: { requestId?: string; idempotencyKey?: string },
): Promise<MarkReadyApiData> {
  const { data } = await backendAxiosClient.post<DiagnosticsApiEnvelope<MarkReadyApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/mark-ready/`,
    body ?? {},
    { headers: requestHeaders(options?.requestId, options?.idempotencyKey) },
  );
  return unwrapApiResponse(data);
}

export async function sendWhatsApp(
  reportId: string,
  payload: { recipient_phone?: string; recipient_email?: string; channel?: string },
  options?: { requestId?: string; idempotencyKey?: string },
): Promise<SendWhatsAppApiData> {
  const { data } = await backendAxiosClient.post<DiagnosticsApiEnvelope<SendWhatsAppApiData>>(
    `${V1_PREFIX}/reports/${encodeURIComponent(reportId)}/send-whatsapp/`,
    { channel: "WHATSAPP", ...payload },
    { headers: requestHeaders(options?.requestId, options?.idempotencyKey) },
  );
  return unwrapApiResponse(data);
}

export async function getReportOperationalMetrics(
  params?: { days?: number; sla_minutes?: number },
  options?: { signal?: AbortSignal; requestId?: string },
): Promise<Record<string, unknown>> {
  const { data } = await backendAxiosClient.get<DiagnosticsApiEnvelope<Record<string, unknown>>>(
    `${V1_PREFIX}/reports/operational-metrics/`,
    {
      params,
      signal: options?.signal,
      headers: requestHeaders(options?.requestId),
    },
  );
  return unwrapApiResponse(data);
}

export async function retryDelivery(
  logId: string,
  options?: { requestId?: string },
): Promise<RetryDeliveryApiData> {
  const { data } = await backendAxiosClient.post<DiagnosticsApiEnvelope<RetryDeliveryApiData>>(
    `${V1_PREFIX}/delivery-logs/${encodeURIComponent(logId)}/retry/`,
    {},
    { headers: requestHeaders(options?.requestId) },
  );
  return unwrapApiResponse(data);
}

/** @deprecated Use getReportsQueue — re-export compatibility */
export const fetchReportTasksList = getReportsQueue;
export const fetchReportTaskContext = getReportTaskContext;
