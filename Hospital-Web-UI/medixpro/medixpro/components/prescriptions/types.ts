export interface PrescriptionSummaryMeta {
  consultation_id?: string;
  encounter_id?: string;
  status?: string;
  created_at?: string;
  completed_at?: string;
  generated_at?: string;
  generated_by?: string;
}

export interface PrescriptionSummaryClinic {
  name?: string;
  address?: string;
  contact?: string;
  email?: string;
}

export interface PrescriptionSummaryDoctor {
  full_name?: string;
  qualification?: string;
  registration_number?: string;
  mobile?: string;
}

export interface PrescriptionSummaryPatient {
  full_name?: string;
  age_display?: string;
  gender?: string;
  mobile?: string;
}

export interface PrescriptionSummaryVisit {
  date_display?: string;
  time_display?: string;
  type?: string;
}

export interface PrescriptionSummaryVitals {
  bp?: string;
  pulse?: string;
  temperature?: string;
  temperature_unit?: string;
  spo2?: string;
  weight_kg?: string;
  height_cm?: string;
}

export interface PrescriptionSummaryDiagnosis {
  name?: string;
}

export interface PrescriptionSummaryMedicine {
  drug_name?: string;
  dosage_display?: string;
  dose_display_numeric?: string;
  timing_pattern?: string;
  frequency_display?: string;
  duration_display?: string;
  instructions?: string;
}

export interface PrescriptionSummaryInstruction {
  text?: string;
}

export interface PrescriptionSummaryFollowUp {
  date_display?: string;
  notes?: string;
}

export interface PrescriptionSummaryInvestigation {
  name?: string;
  type?: string;
  notes?: string;
}

export interface PrescriptionSummaryPayload {
  meta?: PrescriptionSummaryMeta;
  clinic?: PrescriptionSummaryClinic;
  doctor?: PrescriptionSummaryDoctor;
  patient?: PrescriptionSummaryPatient;
  visit?: PrescriptionSummaryVisit;
  vitals?: PrescriptionSummaryVitals;
  diagnoses?: PrescriptionSummaryDiagnosis[];
  prescriptions?: PrescriptionSummaryMedicine[];
  instructions?: PrescriptionSummaryInstruction[];
  investigations?: PrescriptionSummaryInvestigation[];
  follow_up?: PrescriptionSummaryFollowUp;
}

export interface CancelState {
  reason: string;
  reasonText?: string;
  cancelledAt: string;
  cancelledBy: string;
}
