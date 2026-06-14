import { backendAxiosClient } from "@/lib/axiosClient";

export type DoctorReportsDashboardReviewStatus = "READY_FOR_REVIEW" | "PENDING_UPLOAD";

export type DoctorReportsDashboardReportRow = {
  report_id: string | null;
  patient_id: string;
  patient_name: string;
  encounter_id: string | null;
  visit_date: string | null;
  report_type: string;
  uploaded_at: string | null;
  review_status: DoctorReportsDashboardReviewStatus;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
  is_critical: boolean;
  doctor_acknowledged: boolean;
  whatsapp_sent: boolean;
};

export type DoctorReportsDashboardInsights = {
  ready_for_review: number;
  reviewed_today: number;
  pending_upload: number;
  reports_received_today: number;
};

export type DoctorReportsDashboardActivityEventType =
  | "REPORT_UPLOADED"
  | "REPORT_REVIEWED"
  | "REPORT_PENDING_UPLOAD";

export type DoctorReportsDashboardActivity = {
  event_type: DoctorReportsDashboardActivityEventType;
  patient_name: string;
  report_name: string;
  timestamp: string;
};

export type DoctorReportsDashboardData = {
  insights: DoctorReportsDashboardInsights;
  reports: {
    count: number;
    results: DoctorReportsDashboardReportRow[];
  };
  recent_activity: DoctorReportsDashboardActivity[];
};

type DoctorReportsDashboardResponse = {
  status: string;
  data: DoctorReportsDashboardData;
};

export const DOCTOR_REPORTS_PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;
export type DoctorReportsPageSize = (typeof DOCTOR_REPORTS_PAGE_SIZE_OPTIONS)[number];

export async function fetchDoctorReportsDashboard({
  clinicId,
  page = 1,
  pageSize = 10,
  signal,
}: {
  clinicId: string;
  page?: number;
  pageSize?: DoctorReportsPageSize;
  signal?: AbortSignal;
}): Promise<DoctorReportsDashboardData> {
  const response = await backendAxiosClient.get<DoctorReportsDashboardResponse>(
    "v1/doctors/dashboard/reports/",
    {
      params: {
        clinic_id: clinicId,
        page,
        page_size: pageSize,
      },
      validateStatus: () => true,
      signal,
    }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; message?: string })?.error ??
      (response.data as { message?: string })?.message ??
      `Failed to load reports dashboard (${response.status})`;
    throw new Error(detail);
  }

  const data = (response.data as DoctorReportsDashboardResponse)?.data;
  if (!data) {
    throw new Error("Invalid reports dashboard response");
  }

  return data;
}
