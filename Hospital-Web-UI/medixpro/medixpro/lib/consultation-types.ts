/**
 * Consultation UI state types.
 * Shape aligned for future backend API integration.
 */

export type SymptomDetail = {
  /** @deprecated Prefer `additional_notes`; still read when migrating old drafts. */
  note?: string;
  /** Optional free text; sole notes field for template-driven symptoms. */
  additional_notes?: string;
  since?: string;
  severity?: "mild" | "moderate" | "severe";
  continuous?: boolean;
  shivering?: boolean;
  grade?: string;
  maxTemps?: string[];
  respondsToParacetamol?: boolean;
} & Record<string, unknown>;

export interface ConsultationSymptom {
  id: string;
  name: string;
  detail?: SymptomDetail;
  isCustom?: boolean;
}

export interface ConsultationMedicine {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string;
}

/** Right-menu vitals; backend can return same shape. */
export interface ConsultationVitals {
  weightKg?: string;
  heightCm?: string;
  bmi?: string;
  /** Canonical Celsius string from pre-consult preview (name is legacy); UI shows °F. */
  temperatureF?: string;
}

/** Follow-up revisit interval unit (aligns with end-consultation API). */
export type FollowUpUnit = "days" | "weeks";

/** Workflow type: governs visible sections and validation. */
export type ConsultationWorkflowType = "FULL" | "QUICK_RX" | "TEST_ONLY";

export interface ConsultationState {
  /** Workflow type: Full Consultation (default), Quick Prescription, or Test Only Visit. */
  consultationType: ConsultationWorkflowType;
  symptoms: ConsultationSymptom[];
  findings: string;
  diagnosis: string;
  medicines: ConsultationMedicine[];
  investigations: string;
  instructions: string;
  procedures: string;
  /** Follow-up: interval number (e.g. 7 for "7 Days"). */
  follow_up_interval: number;
  /** Follow-up: unit (days | months). */
  follow_up_unit: FollowUpUnit;
  /** Follow-up: next visit date (ISO date string). */
  follow_up_date: string;
  /** Follow-up: optional reason (max 255). */
  follow_up_reason: string;
  /** Follow-up: if symptoms persist, revisit earlier (for prescription print). */
  follow_up_early_if_persist: boolean;
  /** Right menu: medical history (summary or list; backend-driven later). */
  medicalHistory: string;
  /** Right menu: vitals for this consultation. */
  vitals: ConsultationVitals;
  /** Right menu: note printed on prescription. */
  prescriptionNotes: string;
  /** Right menu: note not printed (internal). */
  doctorNotes: string;
}

export const DEFAULT_CONSULTATION_STATE: ConsultationState = {
  consultationType: "FULL",
  symptoms: [],
  findings: "",
  diagnosis: "",
  medicines: [],
  investigations: "",
  instructions: "",
  procedures: "",
  follow_up_interval: 0,
  follow_up_unit: "days",
  follow_up_date: "",
  follow_up_reason: "",
  follow_up_early_if_persist: false,
  medicalHistory: "",
  vitals: {},
  prescriptionNotes: "",
  doctorNotes: "",
};

// ─── Reusable consultation section pattern (backend-agnostic) ─────────────────

export type ConsultationSectionType =
  | "symptoms"
  | "findings"
  | "diagnosis"
  | "medicines"
  | "investigations"
  | "instructions"
  | "follow_up";

/** Medicine timings (multi-select in medicines panel). */
export type MedicineTiming = "before_food" | "after_food" | "empty_stomach" | "bedtime";

/** Duration panel: open-ended / long-term / stat — exclusive with numeric course. */
export type MedicineDurationSpecial = "sos" | "till_required" | "continue" | "stat";

/**
 * Prescription draft for medicines section (`sectionItems.medicines[].detail.medicine`).
 * Aligns with end-state payload for future API integration.
 */
export interface MedicinePrescriptionDetail {
  drug_id?: string;
  /** Custom entry only — aligns with API `is_custom` / future normalization. */
  is_custom?: boolean;
  /** Optional structured strength from quick-add form (custom medicines). */
  custom_strength_value?: number;
  custom_strength_unit?: string;
  strength_label?: string;
  generic_name?: string;
  composition?: string;
  dose_value?: number;
  dose_unit_id?: string;
  dose_is_custom?: boolean;
  dose_custom_text?: string;
  route_id?: string;
  /** Where applied — only when route is Other; optional for validation. */
  route_body_site?: string;
  frequency_id?: string;
  /** Legacy; combined UI keeps standard chips + M/A/N in sync without a mode toggle. */
  frequency_ui_mode?: "standard" | "pattern";
  /** Slots for pattern mode; `frequency_custom_text` stores derived `m-a-n`. */
  frequency_pattern_morning?: boolean;
  frequency_pattern_afternoon?: boolean;
  frequency_pattern_night?: boolean;
  /** When `frequency_id` is `CUSTOM` (legacy free-text) or `PATTERN` (MAN-derived). e.g. 1-0-1 */
  frequency_custom_text?: string;
  duration_value?: number;
  duration_unit?: "days" | "weeks" | "months";
  /** Mutually exclusive with numeric `duration_value` / `duration_unit` in the duration UI. */
  duration_special?: MedicineDurationSpecial;
  duration_is_custom?: boolean;
  duration_custom_text?: string;
  timing?: MedicineTiming[];
  instructions?: string;
  is_prn?: boolean;
  is_stat?: boolean;
  /** Long-term / maintenance medication (e.g. HTN, DM). */
  is_chronic?: boolean;
}

/** Investigation priority for catalog and custom tests (matches backend InvestigationUrgency). */
export type InvestigationUrgencyLevel = "routine" | "urgent" | "stat";

/** Custom investigation classification (UI + payload; procedure maps for analytics). */
export type CustomInvestigationType = "lab" | "radiology" | "procedure" | "other";

/** Detail fields common to all section items (right-side panel). */
export interface SectionItemDetail {
  notes?: string;
  duration?: string; // e.g. "1 Day", "2 Weeks"
  severity?: "mild" | "moderate" | "severe";
  /** Diagnosis section: mark one item as primary for display / print. */
  primary?: boolean;
  /** Multi-select attribute chips (section-specific). */
  attributes?: string[];
  /** User-added tags. */
  customTags?: string[];
  /** When section is `medicines`, structured prescription draft. */
  medicine?: MedicinePrescriptionDetail;
  /** Investigation payload-ready fields. */
  service_id?: string;
  diagnosis_id?: string;
  price_snapshot?: number | null;
  recommendation_source?: "manual" | "diagnosis_map" | "bundle";
  bundle_id?: string;
  /** Lab / radiology / procedure / other — custom and forward-compatible typing. */
  custom_investigation_type?: CustomInvestigationType;
  urgency?: InvestigationUrgencyLevel;
  instructions?: string[];
  /** Static master metadata used in right panel autofill. */
  investigation_category?: string;
  investigation_sample?: string;
  investigation_tat?: string;
  investigation_preparation?: string;
}

/** Single item in any section (symptom, finding, diagnosis, etc.). */
/** Draft-only consultation findings (no DB until End Consultation). */
export interface DraftConsultationFinding {
  id: string;
  /** FindingMaster UUID when known (optional during draft). */
  finding_id?: string | null;
  /** Catalog key from render-schema (e.g. pallor) for master rows. */
  finding_code?: string | null;
  custom_name?: string | null;
  /** Chip / panel title */
  display_label: string;
  is_custom: boolean;
  severity?: "mild" | "moderate" | "severe" | null;
  note?: string;
  extension_data?: Record<string, unknown> | null;
  is_deleted?: boolean;
}

export interface ConsultationSectionItem {
  id: string;
  /** Canonical display name for normalized payloads. */
  name?: string;
  label: string;
  /** Canonical flags (snake_case for payload parity). */
  is_custom?: boolean;
  is_complete?: boolean;
  /** Legacy UI field retained during migration. */
  isCustom?: boolean;
  /** DiagnosisMaster key from render-schema (diagnosis section). */
  diagnosisKey?: string;
  /** DiagnosisMaster ICD code from render-schema (diagnosis section). */
  diagnosisIcdCode?: string;
  /** CustomDiagnosis UUID when pre-created during draft mode. */
  customDiagnosisId?: string;
  /** Master catalog key from render-schema (e.g. pallor); used as finding_code when creating. */
  findingKey?: string;
  detail?: SectionItemDetail;
  /** Optional category for add form (e.g. dropdown). */
  category?: string;
  description?: string;
}

/** Config for one section: static options + attribute chips for detail panel. */
export interface ConsultationSectionConfig {
  type: ConsultationSectionType;
  /** Singular label for "Add <label>" e.g. "Symptom", "Diagnosis". */
  itemLabel: string;
  /** Search placeholder e.g. "Search symptoms". */
  searchPlaceholder: string;
  /** Optional chip shown to the left of search (e.g. "Past symptoms"). */
  searchLeftChip?: string;
  /** Hardcoded options: { id, label }. */
  staticOptions: { id: string; label: string }[];
  /** Duration dropdown options (hours / days / weeks). */
  durationOptions: string[];
  /** Attribute chips for detail panel (section-specific). */
  attributeOptions: string[];
}
