import { backendAxiosClient } from "@/lib/axiosClient";

export type DoctorReportDashboardSummary = {
  pending_review: number;
};

type DoctorReportDashboardSummaryResponse = {
  status: string;
  data: DoctorReportDashboardSummary;
};

export async function fetchDoctorPendingReportsCount({
  doctorId,
  clinicId,
  signal,
}: {
  doctorId: string;
  clinicId: string;
  signal?: AbortSignal;
}): Promise<number> {
  const response = await backendAxiosClient.get<DoctorReportDashboardSummaryResponse>(
    "v1/diagnostics/reports/doctor-summary/",
    {
      params: { doctor_id: doctorId, clinic_id: clinicId },
      validateStatus: () => true,
      signal,
    }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; message?: string })?.error ??
      (response.data as { message?: string })?.message ??
      `Failed to load pending reports (${response.status})`;
    throw new Error(detail);
  }

  return (response.data as DoctorReportDashboardSummaryResponse)?.data?.pending_review ?? 0;
}
