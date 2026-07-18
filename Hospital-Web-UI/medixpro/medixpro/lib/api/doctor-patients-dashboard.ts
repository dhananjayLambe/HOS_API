import { backendAxiosClient } from "@/lib/axiosClient";

export type DoctorPatientsDashboardStatus =
  | "ACTIVE"
  | "FOLLOW_UP_DUE"
  | "TREATMENT_ONGOING"
  | "STABLE";

export type DoctorPatientsDashboardRecentPatient = {
  patient_id: string;
  patient_name: string;
  mobile: string | null;
  last_visit_date: string | null;
  total_visits: number;
  diagnosis: string;
  status: DoctorPatientsDashboardStatus;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  has_open_encounter: boolean;
  open_encounter_state: "consultation_active" | "in_queue" | null;
  has_unfinished_consultation: boolean;
};

export type DoctorPatientsDashboardInsights = {
  patients_seen_today: number;
  followup_due: number;
  treatment_ongoing: number;
  pending_reports: number;
};

export type DoctorPatientsDashboardFollowUpPatient = {
  patient_id: string;
  patient_name: string;
  last_visit_days: number;
  days_overdue: number;
  followup_date: string | null;
};

export type DoctorPatientsDashboardData = {
  insights: DoctorPatientsDashboardInsights;
  recent_patients: {
    count: number;
    results: DoctorPatientsDashboardRecentPatient[];
  };
  followup_patients: DoctorPatientsDashboardFollowUpPatient[];
};

type DoctorPatientsDashboardResponse = {
  status: string;
  data: DoctorPatientsDashboardData;
};

export const DOCTOR_PATIENTS_PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;
export type DoctorPatientsPageSize = (typeof DOCTOR_PATIENTS_PAGE_SIZE_OPTIONS)[number];

export async function fetchDoctorPatientsDashboard({
  clinicId,
  page = 1,
  pageSize = 10,
  signal,
}: {
  clinicId: string;
  page?: number;
  pageSize?: DoctorPatientsPageSize;
  signal?: AbortSignal;
}): Promise<DoctorPatientsDashboardData> {
  const response = await backendAxiosClient.get<DoctorPatientsDashboardResponse>(
    "v1/doctors/dashboard/patients/",
    {
      params: {
        clinic_id: clinicId,
        page,
        page_size: pageSize,
      },
      validateStatus: (status) => status !== 401,
      signal,
    }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; message?: string })?.error ??
      (response.data as { message?: string })?.message ??
      `Failed to load patients dashboard (${response.status})`;
    throw new Error(detail);
  }

  const data = (response.data as DoctorPatientsDashboardResponse)?.data;
  if (!data) {
    throw new Error("Invalid patients dashboard response");
  }

  return data;
}
