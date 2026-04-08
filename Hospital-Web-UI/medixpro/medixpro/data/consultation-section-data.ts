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
  { id: "paracetamol", label: "Paracetamol (500mg)" },
  { id: "ibuprofen", label: "Ibuprofen (200mg)" },
  { id: "amoxicillin", label: "Amoxicillin (500mg)" },
  { id: "omeprazole", label: "Omeprazole (20mg)" },
  { id: "cetirizine", label: "Cetirizine (10mg)" },
  { id: "metformin", label: "Metformin (500mg)" },
  { id: "amlodipine", label: "Amlodipine (5mg)" },
  { id: "azithromycin", label: "Azithromycin (500mg)" },
  { id: "dolo", label: "Dolo 650 (650mg)" },
  { id: "crocin", label: "Crocin (500mg)" },
];

/** Legacy — medicines panel uses `MedicineDetailPanel` chips instead. */
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

export interface InvestigationMasterItem {
  service_id: string;
  name: string;
  aliases?: string[];
  category: string;
  sample: string;
  tat: string;
  preparation: string;
}

export interface InvestigationPackageItem {
  bundle_id: string;
  name: string;
  service_ids: string[];
}

export const INVESTIGATION_INSTRUCTION_CHIPS = [
  "Fasting required",
  "Empty stomach",
  "Morning sample",
  "Post meal",
] as const;

export const INVESTIGATION_QUICK_PICKS = [
  "cbc",
  "rbs",
  "lft",
  "kft",
  "ecg",
  "xray-chest",
  "crp",
] as const;

export const INVESTIGATION_MASTER_ITEMS: InvestigationMasterItem[] = [
  {
    service_id: "cbc",
    name: "CBC",
    aliases: ["complete blood count"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "Fasting recommended",
  },
  {
    service_id: "rbs",
    name: "RBS",
    aliases: ["random blood sugar"],
    category: "Lab Test",
    sample: "Blood",
    tat: "6 hours",
    preparation: "No fasting needed",
  },
  {
    service_id: "lft",
    name: "LFT",
    aliases: ["liver function test"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "Fasting preferred",
  },
  {
    service_id: "kft",
    name: "KFT",
    aliases: ["kidney function test"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "Hydrate well before sample",
  },
  {
    service_id: "tsh",
    name: "TSH",
    aliases: ["thyroid stimulating hormone"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "Morning sample preferred",
  },
  {
    service_id: "ecg",
    name: "ECG",
    aliases: ["electrocardiogram"],
    category: "Cardiac Test",
    sample: "NA",
    tat: "Immediate",
    preparation: "No special preparation",
  },
  {
    service_id: "xray-chest",
    name: "X-ray Chest",
    aliases: ["xray", "chest xray"],
    category: "Radiology",
    sample: "NA",
    tat: "Same day",
    preparation: "Remove metallic accessories",
  },
  {
    service_id: "urine-r",
    name: "Urine R/M",
    aliases: ["urine routine", "urine microscopy"],
    category: "Lab Test",
    sample: "Urine",
    tat: "12 hours",
    preparation: "Clean-catch sample preferred",
  },
  {
    service_id: "hb",
    name: "Hb",
    aliases: ["hemoglobin"],
    category: "Lab Test",
    sample: "Blood",
    tat: "8 hours",
    preparation: "No special preparation",
  },
  {
    service_id: "crp",
    name: "CRP",
    aliases: ["c-reactive protein"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "No special preparation",
  },
  {
    service_id: "dengue-ns1",
    name: "Dengue NS1",
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "No special preparation",
  },
  {
    service_id: "malaria-antigen",
    name: "Malaria Antigen",
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "No special preparation",
  },
  {
    service_id: "hba1c",
    name: "HbA1c",
    aliases: ["glycated hemoglobin"],
    category: "Lab Test",
    sample: "Blood",
    tat: "24 hours",
    preparation: "No fasting needed",
  },
  {
    service_id: "fbs",
    name: "FBS",
    aliases: ["fasting blood sugar"],
    category: "Lab Test",
    sample: "Blood",
    tat: "6 hours",
    preparation: "8-10 hours fasting required",
  },
  {
    service_id: "ppbs",
    name: "PPBS",
    aliases: ["post prandial blood sugar"],
    category: "Lab Test",
    sample: "Blood",
    tat: "6 hours",
    preparation: "2 hours after meal",
  },
];

export const INVESTIGATION_PACKAGES: InvestigationPackageItem[] = [
  {
    bundle_id: "fever-panel",
    name: "Fever Panel",
    service_ids: ["cbc", "crp", "dengue-ns1", "malaria-antigen"],
  },
  {
    bundle_id: "infection-panel",
    name: "Infection Panel",
    service_ids: ["cbc", "crp", "urine-r"],
  },
  {
    bundle_id: "diabetes-panel",
    name: "Diabetes Panel",
    service_ids: ["fbs", "ppbs", "hba1c"],
  },
  {
    bundle_id: "thyroid-panel",
    name: "Thyroid Panel",
    service_ids: ["tsh"],
  },
  {
    bundle_id: "full-body-checkup",
    name: "Full Body Checkup",
    service_ids: ["cbc", "lft", "kft", "rbs", "urine-r", "tsh"],
  },
];

export const INVESTIGATION_POPULAR_PACKAGE_IDS = [
  "diabetes-panel",
  "thyroid-panel",
  "full-body-checkup",
] as const;

export const INVESTIGATION_DIAGNOSIS_TEST_MAP: Record<string, string[]> = {
  "viral-fever": ["cbc", "crp", "dengue-ns1"],
  "acute respiratory infection": ["cbc", "crp", "xray-chest"],
  "upper respiratory infection": ["cbc", "crp"],
  uti: ["cbc", "urine-r", "crp"],
  dyspepsia: ["cbc", "lft"],
  anemia: ["cbc", "hb"],
  hypertension: ["ecg", "kft"],
  "type 2 diabetes": ["fbs", "ppbs", "hba1c"],
  dm2: ["fbs", "ppbs", "hba1c"],
};

export const INVESTIGATION_DIAGNOSIS_PACKAGE_MAP: Record<string, string[]> = {
  "viral-fever": ["fever-panel", "infection-panel"],
  "acute respiratory infection": ["infection-panel"],
  "upper respiratory infection": ["infection-panel"],
  uti: ["infection-panel"],
  "type 2 diabetes": ["diabetes-panel"],
  dm2: ["diabetes-panel"],
};

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
  follow_up: {
    type: "follow_up",
    itemLabel: "Follow-Up",
    searchPlaceholder: "",
    staticOptions: [],
    durationOptions: [],
    attributeOptions: [],
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
