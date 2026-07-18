import axiosClient from "@/lib/axiosClient";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";

export type { PatientSummaryPayload };

export async function getPatientSummary(
  patientId: string,
  signal?: AbortSignal,
  clinicId?: string
): Promise<PatientSummaryPayload> {
  const response = await axiosClient.get<PatientSummaryPayload>(`/patients/${patientId}/summary/`, {
    signal,
    params: clinicId ? { clinic_id: clinicId } : undefined,
  });
  return response.data;
}
