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
