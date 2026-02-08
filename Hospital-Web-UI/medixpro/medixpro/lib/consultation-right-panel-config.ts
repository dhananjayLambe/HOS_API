/**
 * Right panel (symptom detail) menu config.
 * Hardcoded for now; replace with API response later for dynamic backend.
 * Backend can return the same shape: SymptomDetailSection[].
 */

export type RightPanelFieldType =
  | "note"
  | "since"
  | "severity"
  | "toggle_group"
  | "grade"
  | "max_temps"
  | "paracetamol";

export interface ToggleOption {
  value: string;
  label: string;
  /** Store key for boolean (e.g. 'continuous', 'shivering') */
  storeKey?: string;
}

export interface SymptomDetailSection {
  id: string;
  label?: string;
  /** "More options" etc. */
  fieldType: RightPanelFieldType;
  /** For since: dropdown options. For severity: radio options. */
  options?: string[];
  /** For toggle_group: pairs like [{ continuous: true }, { continuous: false }] */
  toggleGroups?: { storeKey: keyof import("./consultation-types").SymptomDetail; options: ToggleOption[] }[];
  /** For max_temps: button labels */
  maxTempLabels?: string[];
}

/**
 * Default right-panel sections for symptom detail.
 * Later: fetch from API e.g. GET /api/consultation/symptom-detail-fields?symbol=Fever
 */
export const DEFAULT_SYMPTOM_DETAIL_SECTIONS: SymptomDetailSection[] = [
  {
    id: "note",
    label: "Note",
    fieldType: "note",
  },
  {
    id: "since",
    label: "Since",
    fieldType: "since",
    options: ["1 Day", "2 Days", "3 Days", "1 Week", "2 Weeks", "1 Month"],
  },
  {
    id: "severity",
    label: "Severity",
    fieldType: "severity",
    options: ["Mild", "Moderate", "Severe"],
  },
  {
    id: "more_options",
    label: "More options",
    fieldType: "toggle_group",
    toggleGroups: [
      {
        storeKey: "continuous",
        options: [
          { value: "true", label: "Continuous" },
          { value: "false", label: "Intermittent" },
        ],
      },
      {
        storeKey: "shivering",
        options: [
          { value: "true", label: "Shivering" },
          { value: "false", label: "No Shivering" },
        ],
      },
    ],
  },
  {
    id: "grade",
    label: "Grade",
    fieldType: "grade",
  },
  {
    id: "max_temps",
    fieldType: "max_temps",
    maxTempLabels: ["Max 100", "Max 101", "Max 102", "Max 103"],
  },
  {
    id: "paracetamol",
    fieldType: "paracetamol",
  },
];

/**
 * Fetch config for right panel. Hardcoded now; replace with API call later.
 * Example future API: return (await api.getSymptomDetailFields(symptomName)) as SymptomDetailSection[];
 */
export function getSymptomDetailSections(_symptomName?: string): SymptomDetailSection[] {
  return DEFAULT_SYMPTOM_DETAIL_SECTIONS;
}
