/**
 * Shared medicine types for Django `/medicines/suggestions/` and `/medicines/hybrid/`.
 */

/** Nested `autofill` from Django `build_autofill` (hybrid + suggestions). */
export interface MedicineAutofillDose {
  value: number;
  unit: string;
  unit_id: string | null;
  source: string;
}

export interface MedicineAutofillFrequency {
  id: string | null;
  code: string;
  display: string;
  source: string;
}

export interface MedicineAutofillTiming {
  relation: string;
  time_slots: string[];
  source: string;
}

export interface MedicineAutofillDuration {
  value: number;
  unit: string;
  source: string;
}

export interface MedicineAutofillRoute {
  id: string | null;
  name: string;
  source: string;
}

export interface MedicineAutofillInstructionLine {
  text: string;
  source: string;
}

export interface MedicineAutofill {
  dose: MedicineAutofillDose;
  frequency: MedicineAutofillFrequency;
  timing: MedicineAutofillTiming;
  duration: MedicineAutofillDuration;
  route: MedicineAutofillRoute;
  instructions: MedicineAutofillInstructionLine[];
}

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
  /** Server-computed prescription hints (no extra API). */
  autofill?: MedicineAutofill | null;
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
