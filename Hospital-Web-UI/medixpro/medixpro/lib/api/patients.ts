"use client";

import axiosClient from "@/lib/axiosClient";

export type PatientListFilter = "recent" | "today" | "follow_up_due" | "has_active_rx";

export interface PatientListRow {
  patient_id: string;
  patient_account_id: string;
  uhid: string;
  full_name: string;
  first_name: string;
  last_name: string;
  age_display: string;
  gender: string;
  mobile: string | null;
  last_visit_at: string | null;
  recent_diagnosis: string;
  active_prescriptions_count: number;
  visits_count: number;
  has_open_encounter: boolean;
  open_encounter_state: "in_queue" | "consultation_active" | null;
  has_unfinished_consultation: boolean;
  is_follow_up_due: boolean;
}

export interface PatientListResponse {
  results: PatientListRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  filter: PatientListFilter;
}

export interface PatientListParams {
  q?: string;
  filter?: PatientListFilter;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function fetchPatientList(params: PatientListParams): Promise<PatientListResponse> {
  const response = await axiosClient.get<PatientListResponse>("/patients/list/", {
    params: {
      q: params.q || "",
      filter: params.filter || "recent",
      page: params.page || 1,
      page_size: params.pageSize || 20,
    },
    signal: params.signal,
  });
  return response.data;
}
