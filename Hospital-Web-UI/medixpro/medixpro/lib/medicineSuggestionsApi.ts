import { backendAxiosClient } from "@/lib/axiosClient";

/** Matches Django `drug_to_payload` in medicines/api/serializers.py */
export interface MedicineSuggestionDrug {
  id: string;
  brand_name: string;
  display_name: string;
  generic_name: string | null;
  strength: string | null;
  drug_type: string | null;
  is_common: boolean;
  formulation: { id: string; name: string } | null;
  source: string | null;
  last_used: string | null;
  last_used_ago: string | null;
  final_score?: number;
  components?: Record<string, number>;
  dominant_signal?: string | null;
}

export type MedicineSuggestionsResponse = {
  quick_suggestions: MedicineSuggestionDrug[];
  doctor_preferred: MedicineSuggestionDrug[];
  based_on_diagnosis: MedicineSuggestionDrug[];
  recent_for_patient: MedicineSuggestionDrug[];
  others: MedicineSuggestionDrug[];
};

const BUCKET_ORDER = [
  "quick_suggestions",
  "doctor_preferred",
  "based_on_diagnosis",
  "recent_for_patient",
  "others",
] as const;

/**
 * Doctor habit before diagnosis-driven — merge API buckets in this order; dedupe strictly by drug id.
 */
export function flattenMedicineSuggestions(data: MedicineSuggestionsResponse): {
  chips: { id: string; label: string }[];
  byId: Record<string, MedicineSuggestionDrug>;
} {
  const seen = new Set<string>();
  const byId: Record<string, MedicineSuggestionDrug> = {};
  const chips: { id: string; label: string }[] = [];

  for (const key of BUCKET_ORDER) {
    const rows = data[key] ?? [];
    for (const row of rows) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      byId[row.id] = row;
      const label = (row.display_name || row.brand_name || "").trim() || "Medicine";
      chips.push({ id: row.id, label });
    }
  }
  return { chips, byId };
}

export async function fetchMedicineSuggestions(args: {
  doctorId: string;
  patientId?: string | null;
  consultationId?: string | null;
  /** Only non-empty lists are sent — repeated `diagnosis_ids` keys for Django QueryDict. */
  diagnosisIds?: string[];
  limit?: number;
}): Promise<MedicineSuggestionsResponse> {
  const sp = new URLSearchParams();
  sp.set("doctor_id", args.doctorId);
  if (args.patientId) sp.set("patient_id", args.patientId);
  if (args.consultationId) sp.set("consultation_id", args.consultationId);
  sp.set("limit", String(Math.min(Math.max(args.limit ?? 10, 1), 15)));
  for (const id of args.diagnosisIds ?? []) {
    if (id?.trim()) sp.append("diagnosis_ids", id.trim());
  }
  const res = await backendAxiosClient.get<MedicineSuggestionsResponse>(
    `medicines/suggestions/?${sp.toString()}`
  );
  return res.data;
}
