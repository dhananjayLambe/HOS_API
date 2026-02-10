/**
 * Hardcoded local data for consultation sections.
 * Backend-agnostic; replace with API later (ICD, drug DB, etc.).
 */

import type {
  ConsultationSectionConfig,
  ConsultationSectionType,
} from "@/lib/consultation-types";

const DURATION_COMMON = [
  "Few hours",
  "1 Day",
  "2 Days",
  "3 Days",
  "1 Week",
  "2 Weeks",
  "1 Month",
  "2 Months",
];

export const SYMPTOMS_STATIC: { id: string; label: string }[] = [
  { id: "cough", label: "Cough" },
  { id: "cold", label: "Cold" },
  { id: "fever", label: "Fever" },
  { id: "vomiting", label: "Vomiting" },
  { id: "stomach", label: "Stomach pain" },
  { id: "headache", label: "Headache" },
  { id: "abdominal", label: "Abdominal pain" },
  { id: "running-nose", label: "Running nose" },
  { id: "loose-stools", label: "Loose stools" },
  { id: "throat-pain", label: "Throat pain" },
  { id: "chest-pain", label: "Chest pain" },
  { id: "dizziness", label: "Dizziness" },
  { id: "fatigue", label: "Fatigue" },
  { id: "rash", label: "Rash" },
  { id: "itching", label: "Itching" },
];

export const SYMPTOM_ATTRIBUTES = [
  "Continuous",
  "Intermittent",
  "Dry",
  "Productive",
  "Sharp",
  "Dull",
  "Radiating",
];

export const FINDINGS_STATIC: { id: string; label: string }[] = [
  { id: "bp-elevated", label: "BP elevated" },
  { id: "temp-elevated", label: "Temp elevated" },
  { id: "pulse-rapid", label: "Pulse rapid" },
  { id: "throat-congested", label: "Throat congested" },
  { id: "ears-clear", label: "Ears clear" },
  { id: "heart-normal", label: "Heart S1 S2 normal" },
  { id: "lungs-clear", label: "Lungs clear" },
  { id: "abdomen-soft", label: "Abdomen soft" },
  { id: "skin-normal", label: "Skin normal" },
  { id: "cns-alert", label: "CNS alert" },
];

export const FINDING_ATTRIBUTES = ["Left", "Right", "Bilateral", "Localized", "Generalized"];

export const DIAGNOSIS_STATIC: { id: string; label: string }[] = [
  { id: "ari", label: "Acute respiratory infection" },
  { id: "uri", label: "Upper respiratory infection" },
  { id: "gastritis", label: "Gastritis" },
  { id: "viral-fever", label: "Viral fever" },
  { id: "hypertension", label: "Hypertension" },
  { id: "dm2", label: "Type 2 diabetes" },
  { id: "anemia", label: "Anemia" },
  { id: "uti", label: "UTI" },
  { id: "dyspepsia", label: "Dyspepsia" },
  { id: "migraine", label: "Migraine" },
];

export const DIAGNOSIS_ATTRIBUTES = ["Provisional", "Confirmed", "R/O", "Differential"];

export const MEDICINES_STATIC: { id: string; label: string }[] = [
  { id: "paracetamol", label: "Paracetamol" },
  { id: "ibuprofen", label: "Ibuprofen" },
  { id: "amoxicillin", label: "Amoxicillin" },
  { id: "omeprazole", label: "Omeprazole" },
  { id: "cetirizine", label: "Cetirizine" },
  { id: "metformin", label: "Metformin" },
  { id: "amlodipine", label: "Amlodipine" },
  { id: "azithromycin", label: "Azithromycin" },
  { id: "dolo", label: "Dolo 650" },
  { id: "crocin", label: "Crocin" },
];

export const MEDICINE_ATTRIBUTES = ["Morning", "Night", "SOS", "After food", "Before food", "With food"];

export const INVESTIGATIONS_STATIC: { id: string; label: string }[] = [
  { id: "cbc", label: "CBC" },
  { id: "rbs", label: "RBS" },
  { id: "lft", label: "LFT" },
  { id: "kft", label: "KFT" },
  { id: "tsh", label: "TSH" },
  { id: "ecg", label: "ECG" },
  { id: "xray-chest", label: "X-ray Chest" },
  { id: "urine-r", label: "Urine R/M" },
  { id: "hb", label: "Hb" },
  { id: "crp", label: "CRP" },
];

export const INVESTIGATION_ATTRIBUTES = ["Fasting", "Random", "Repeat", "Stat"];

export const INSTRUCTIONS_STATIC: { id: string; label: string }[] = [
  { id: "rest", label: "Rest at home" },
  { id: "fluids", label: "Plenty of fluids" },
  { id: "follow-up", label: "Follow up if worse" },
  { id: "diet", label: "Light diet" },
  { id: "avoid-exertion", label: "Avoid exertion" },
  { id: "wound-care", label: "Wound care" },
  { id: "monitor-temp", label: "Monitor temperature" },
  { id: "complete-course", label: "Complete antibiotic course" },
  { id: "no-driving", label: "Avoid driving if drowsy" },
  { id: "emergency", label: "Report to ER if severe" },
];

export const INSTRUCTION_ATTRIBUTES = ["Critical", "Routine", "Patient education"];

export const CONSULTATION_SECTION_CONFIGS: Record<string, ConsultationSectionConfig> = {
  symptoms: {
    type: "symptoms",
    itemLabel: "Symptom",
    searchPlaceholder: "Search symptoms",
    staticOptions: SYMPTOMS_STATIC,
    durationOptions: DURATION_COMMON,
    attributeOptions: SYMPTOM_ATTRIBUTES,
  },
  findings: {
    type: "findings",
    itemLabel: "Finding",
    searchPlaceholder: "Search findings",
    staticOptions: FINDINGS_STATIC,
    durationOptions: DURATION_COMMON,
    attributeOptions: FINDING_ATTRIBUTES,
  },
  diagnosis: {
    type: "diagnosis",
    itemLabel: "Diagnosis",
    searchPlaceholder: "Search diagnosis",
    staticOptions: DIAGNOSIS_STATIC,
    durationOptions: DURATION_COMMON,
    attributeOptions: DIAGNOSIS_ATTRIBUTES,
  },
  medicines: {
    type: "medicines",
    itemLabel: "Medicine",
    searchPlaceholder: "Search medicines",
    staticOptions: MEDICINES_STATIC,
    durationOptions: ["3 days", "5 days", "7 days", "10 days", "2 weeks", "1 month"],
    attributeOptions: MEDICINE_ATTRIBUTES,
  },
  investigations: {
    type: "investigations",
    itemLabel: "Investigation",
    searchPlaceholder: "Search investigations",
    staticOptions: INVESTIGATIONS_STATIC,
    durationOptions: DURATION_COMMON,
    attributeOptions: INVESTIGATION_ATTRIBUTES,
  },
  instructions: {
    type: "instructions",
    itemLabel: "Instruction",
    searchPlaceholder: "Search instructions",
    staticOptions: INSTRUCTIONS_STATIC,
    durationOptions: [],
    attributeOptions: INSTRUCTION_ATTRIBUTES,
  },
};

const DEFAULT_SECTION_CONFIG: ConsultationSectionConfig = {
  type: "symptoms",
  itemLabel: "Item",
  searchPlaceholder: "Search",
  staticOptions: [],
  durationOptions: DURATION_COMMON,
  attributeOptions: [],
};

export function getSectionConfig(type: ConsultationSectionType): ConsultationSectionConfig {
  const config = CONSULTATION_SECTION_CONFIGS[type];
  return config ?? { ...DEFAULT_SECTION_CONFIG, type };
}
