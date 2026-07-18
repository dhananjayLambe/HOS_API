import { backendAxiosClient } from "@/lib/axiosClient";

export type DoctorPracticeOverviewMetrics = {
  patients_today: number;
  patients_this_week: number;
  patient_visits_this_month: number;
  followups_completed: number;
  consultations_completed: number;
};

export type DoctorPracticeOverviewConsultationMix = {
  new_consultations: number;
  followup_consultations: number;
  cancelled: number;
  no_show: number;
};

export type DoctorPracticeOverviewSummary = {
  new_patients: number;
  returning_patients: number;
  active_treatments: number;
  patients_under_treatment: number;
};

export type DoctorPracticeOverviewTrendRow = {
  metric_key: string;
  label: string;
  today: number;
  week: number;
};

export type DoctorPracticeOverviewV2Analytics = {
  daily_consultations: unknown[];
  monthly_growth: unknown[];
  top_diagnoses: unknown[];
  top_prescribed_medicines: unknown[];
};

export type DoctorPracticeOverviewDashboardData = {
  generated_at: string;
  practice_metrics: DoctorPracticeOverviewMetrics;
  consultation_mix: DoctorPracticeOverviewConsultationMix;
  practice_summary: DoctorPracticeOverviewSummary;
  recent_trends: DoctorPracticeOverviewTrendRow[];
  v2_analytics: DoctorPracticeOverviewV2Analytics;
};

type DoctorPracticeOverviewDashboardResponse = {
  status: string;
  data: DoctorPracticeOverviewDashboardData;
};

export async function fetchDoctorPracticeOverviewDashboard({
  clinicId,
  signal,
}: {
  clinicId: string;
  signal?: AbortSignal;
}): Promise<DoctorPracticeOverviewDashboardData> {
  const response = await backendAxiosClient.get<DoctorPracticeOverviewDashboardResponse>(
    "v1/doctors/dashboard/practice-overview/",
    {
      params: { clinic_id: clinicId },
      validateStatus: (status) => status !== 401,
      signal,
    },
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; message?: string })?.error ??
      (response.data as { message?: string })?.message ??
      `Failed to load practice overview (${response.status})`;
    throw new Error(detail);
  }

  const data = (response.data as DoctorPracticeOverviewDashboardResponse)?.data;
  if (!data) {
    throw new Error("Invalid practice overview response");
  }

  return data;
}
