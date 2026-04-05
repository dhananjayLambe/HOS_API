import { backendAxiosClient } from "@/lib/axiosClient";
import type { MedicineHybridResponse } from "@/types/medicine";
import type { MedicineSuggestionsResponse } from "@/lib/medicineSuggestionsApi";

export type MedicineSuggestionsParams = {
  doctorId: string;
  patientId?: string | null;
  consultationId?: string | null;
  diagnosisIds?: string[];
  limit?: number;
};

export type MedicineHybridParams = MedicineSuggestionsParams & {
  q: string;
};

/**
 * Build query string with repeated `diagnosis_ids` keys (Django QueryDict style).
 */
export function buildMedicineQueryString(params: {
  doctor_id: string;
  patient_id?: string | null;
  consultation_id?: string | null;
  diagnosis_ids?: string[];
  limit?: number;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("doctor_id", params.doctor_id);
  if (params.patient_id) sp.set("patient_id", params.patient_id);
  if (params.consultation_id) sp.set("consultation_id", params.consultation_id);
  sp.set("limit", String(Math.min(Math.max(params.limit ?? 10, 1), 15)));
  for (const id of params.diagnosis_ids ?? []) {
    if (id?.trim()) sp.append("diagnosis_ids", id.trim());
  }
  if (params.q != null && params.q !== "") sp.set("q", params.q);
  return sp.toString();
}

export async function fetchMedicineSuggestionsDirect(
  args: MedicineSuggestionsParams,
  options?: { signal?: AbortSignal }
): Promise<MedicineSuggestionsResponse> {
  const qs = buildMedicineQueryString({
    doctor_id: args.doctorId,
    patient_id: args.patientId ?? undefined,
    consultation_id: args.consultationId ?? undefined,
    diagnosis_ids: args.diagnosisIds?.length ? args.diagnosisIds : undefined,
    limit: args.limit,
  });
  const res = await backendAxiosClient.get<MedicineSuggestionsResponse>(
    `medicines/suggestions/?${qs}`,
    { signal: options?.signal }
  );
  return res.data;
}

export async function fetchMedicineHybrid(
  args: MedicineHybridParams,
  options?: { signal?: AbortSignal }
): Promise<MedicineHybridResponse> {
  const qs = buildMedicineQueryString({
    doctor_id: args.doctorId,
    patient_id: args.patientId ?? undefined,
    consultation_id: args.consultationId ?? undefined,
    diagnosis_ids: args.diagnosisIds?.length ? args.diagnosisIds : undefined,
    limit: args.limit,
    q: args.q.trim(),
  });
  const res = await backendAxiosClient.get<MedicineHybridResponse>(
    `medicines/hybrid/?${qs}`,
    { signal: options?.signal }
  );
  return res.data;
}
