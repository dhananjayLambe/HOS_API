"use client";

import axiosClient from "@/lib/axiosClient";

export type ClinicalVisitListItemApi = {
  visit_id: string;
  visit_pnr: string;
  started_at: string | null;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string;
  patient_mobile: string;
  patient_uhid: string;
  doctor_name: string;
  doctor_id: string | null;
  visit_type: string;
  status: string;
  has_prescription: boolean;
  prescription_id: string | null;
  tests_count: number;
  reports_count: number;
};

export type ClinicalVisitsListResponse = {
  results: ClinicalVisitListItemApi[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type ClinicalVisitsSummaryResponse = {
  today_visits: number;
  completed_visits: number;
  followups: number;
};

export type ClinicalVisitDetailApi = {
  visit_id: string;
  visit_pnr: string;
  consultation_id: string | null;
  prescription_id: string | null;
  patient: {
    name: string;
    age: number | null;
    gender: string;
    mobile: string;
    uhid: string;
  };
  visit: {
    visit_type: string;
    status: string;
    doctor_name: string;
    doctor_id: string | null;
    date: string | null;
    time: string | null;
    started_at: string | null;
    duration_minutes: number | null;
  };
  clinical_summary: {
    chief_complaints: string[];
    diagnosis: string[];
    advice: string[];
  };
  prescription_lines: Array<{
    medicine_name: string;
    frequency: string;
    duration: string;
  }>;
  tests_advised: string[];
  reports: Array<{
    report_id: string;
    test_label: string;
    status: string;
    delivery_status: string;
    updated_at: string;
    download_url?: string;
  }>;
  has_prescription: boolean;
  tests_count: number;
  reports_count: number;
};

export type ClinicalVisitsQueryInput = {
  search?: string;
  from_date?: string;
  to_date?: string;
  doctor_id?: string;
  visit_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export function buildClinicalVisitsQueryParams(
  input: ClinicalVisitsQueryInput,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (input.search) params.search = input.search;
  if (input.from_date) params.from_date = input.from_date;
  if (input.to_date) params.to_date = input.to_date;
  if (input.doctor_id) params.doctor_id = input.doctor_id;
  if (input.visit_type) params.visit_type = input.visit_type;
  if (input.status) params.status = input.status;
  if (input.page) params.page = input.page;
  if (input.page_size) params.page_size = input.page_size;
  if (input.ordering) params.ordering = input.ordering;
  return params;
}

export async function fetchClinicalVisitsList(
  input: ClinicalVisitsQueryInput,
  options?: { signal?: AbortSignal },
): Promise<ClinicalVisitsListResponse> {
  const { data } = await axiosClient.get<ClinicalVisitsListResponse>("/v1/visits/", {
    params: buildClinicalVisitsQueryParams(input),
    signal: options?.signal,
  });
  return data;
}

export async function fetchClinicalVisitsSummary(
  options?: { signal?: AbortSignal },
): Promise<ClinicalVisitsSummaryResponse> {
  const { data } = await axiosClient.get<ClinicalVisitsSummaryResponse>(
    "/v1/visits/dashboard-summary/",
    { signal: options?.signal },
  );
  return data;
}

export async function fetchClinicalVisitDetail(
  visitId: string,
  options?: { signal?: AbortSignal },
): Promise<ClinicalVisitDetailApi> {
  const { data } = await axiosClient.get<ClinicalVisitDetailApi>(`/v1/visits/${visitId}/`, {
    signal: options?.signal,
  });
  return data;
}

export function prescriptionDownloadUrl(prescriptionId: string): string {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "/api").replace(
    /\/+$/,
    "",
  );
  return `${base}/v1/prescriptions/${prescriptionId}/download/`;
}
