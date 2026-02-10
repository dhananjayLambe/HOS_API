/**
 * Consultation UI state types.
 * Shape aligned for future backend API integration.
 */

export interface SymptomDetail {
  note?: string;
  since?: string;
  severity?: "mild" | "moderate" | "severe";
  continuous?: boolean;
  shivering?: boolean;
  grade?: string;
  maxTemps?: string[];
  respondsToParacetamol?: boolean;
}

export interface ConsultationSymptom {
  id: string;
  name: string;
  detail?: SymptomDetail;
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
  temperatureF?: string;
}

export interface ConsultationState {
  symptoms: ConsultationSymptom[];
  findings: string;
  diagnosis: string;
  medicines: ConsultationMedicine[];
  investigations: string;
  instructions: string;
  procedures: string;
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
  symptoms: [],
  findings: "",
  diagnosis: "",
  medicines: [],
  investigations: "",
  instructions: "",
  procedures: "",
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
  | "instructions";

/** Detail fields common to all section items (right-side panel). */
export interface SectionItemDetail {
  notes?: string;
  duration?: string; // e.g. "1 Day", "2 Weeks"
  severity?: "mild" | "moderate" | "severe";
  /** Multi-select attribute chips (section-specific). */
  attributes?: string[];
  /** User-added tags. */
  customTags?: string[];
}

/** Single item in any section (symptom, finding, diagnosis, etc.). */
export interface ConsultationSectionItem {
  id: string;
  label: string;
  isCustom?: boolean;
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
