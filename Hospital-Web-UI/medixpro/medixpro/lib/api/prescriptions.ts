"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type { PrescriptionSummaryPayload } from "@/components/prescriptions/types";

export type PrescriptionStatusFilter = "all" | "active" | "cancelled";

export interface PrescriptionListItem {
  consultation_id: string;
  encounter_id?: string | null;
  prescription_id?: string | null;
  pnr: string;
  patient: {
    full_name?: string;
    age_display?: string;
    gender?: string;
    mobile?: string;
  };
  diagnosis_summary?: string | null;
  medicines_count?: number;
  medicines_preview?: string[];
  consultation_date?: string | null;
  is_cancelled: boolean;
  cancelled_at?: string | null;
}

export interface PrescriptionListResponse {
  count: number;
  page: number;
  page_size: number;
  results: PrescriptionListItem[];
}

export interface ListPrescriptionsParams {
  search?: string;
  status?: PrescriptionStatusFilter;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Doctor-scoped paginated prescription list.
 * Backend contract: GET /api/consultations/prescriptions/ (auth = doctor JWT).
 */
export async function listPrescriptions(
  params: ListPrescriptionsParams,
  options?: { signal?: AbortSignal }
) {
  const query: Record<string, string> = {};
  if (params.search && params.search.trim()) query.search = params.search.trim();
  if (params.status && params.status !== "all") query.status = params.status;
  if (params.date_from) query.date_from = params.date_from;
  if (params.date_to) query.date_to = params.date_to;
  if (params.page) query.page = String(params.page);
  if (params.page_size) query.page_size = String(params.page_size);

  return backendAxiosClient.get<PrescriptionListResponse>("/consultations/prescriptions/", {
    params: query,
    signal: options?.signal,
  });
}

/** GET /api/consultations/{id}/summary-lite/ — JSON used by drawer header + fallback preview. */
export async function fetchPrescriptionSummary(
  consultationId: string,
  options?: { signal?: AbortSignal }
) {
  return backendAxiosClient.get<PrescriptionSummaryPayload>(
    `/consultations/${encodeURIComponent(consultationId)}/summary-lite/`,
    { signal: options?.signal }
  );
}

/** POST /api/consultations/{id}/summary-lite/html/ — rendered HTML for iframe preview. */
export async function fetchPrescriptionPreviewHtml(
  consultationId: string,
  options?: { signal?: AbortSignal }
) {
  return backendAxiosClient.post<{ html?: string }>(
    `/consultations/${encodeURIComponent(consultationId)}/summary-lite/html/`,
    {},
    { signal: options?.signal }
  );
}

export interface CancelPrescriptionPayload {
  reason_code: string;
  reason_text?: string;
  source?: "doctor";
}

export interface CancelPrescriptionResponse {
  status: string;
  prescription_id: string;
  prescription_pnr: string;
  cancelled_at: string;
  cancelled_by_source: string;
  cancel_reason_code: string;
  cancel_reason_text: string;
}

/** POST /api/consultations/{id}/prescription/cancel/ */
export async function cancelPrescription(
  consultationId: string,
  payload: CancelPrescriptionPayload
) {
  return backendAxiosClient.post<CancelPrescriptionResponse>(
    `/consultations/${encodeURIComponent(consultationId)}/prescription/cancel/`,
    {
      reason_code: payload.reason_code,
      reason_text: payload.reason_text || "",
      source: payload.source || "doctor",
    }
  );
}

/**
 * POST /api/consultations/{id}/summary-lite/pdf/ — returns binary PDF.
 * Uses raw fetch so we can read a Blob and trigger an anchor download.
 */
export async function downloadPrescriptionPdf(
  consultationId: string,
  filenameHint?: string
): Promise<void> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
  const response = await fetch(
    `/api/consultations/${encodeURIComponent(consultationId)}/summary-lite/pdf/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let detail = "Unable to download prescription";
    if (contentType.includes("application/json")) {
      try {
        const body = await response.json();
        detail = body?.detail || body?.message || detail;
      } catch {
        // ignore
      }
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `prescription-${filenameHint || consultationId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
