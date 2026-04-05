/**
 * Shared medicine types for Django `/medicines/suggestions/` and `/medicines/hybrid/`.
 */

/** Single row from GET /api/medicines/hybrid/ */
export interface MedicineHybridResultRow {
  id: string;
  display_name: string;
  brand_name: string;
  strength: string;
  drug_type: string;
  formulation: { id: string | null; name: string } | null;
  source: string;
  score: number;
  /** When API echoes last prescription hint for this drug */
  last_used?: string | null;
}

/** Normalized chip for inline UI — dedupe key is always `id`. */
export interface NormalizedMedicineChip {
  id: string;
  label: string;
  source: string | null;
  /** Original API row for prescription build */
  raw: unknown;
}

export interface MedicineHybridMeta {
  mode: string;
  timing_ms: number;
}

export interface MedicineHybridResponse {
  results: MedicineHybridResultRow[];
  meta: MedicineHybridMeta;
}
