export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi-select"
  | "radio"
  | "date"
  | "toggle";

export interface FieldDependency {
  field: string;
  operator: string;
  value: unknown;
}

export interface SymptomFieldSchema {
  key: string;
  label: string;
  type: FieldType | string;
  placeholder?: string;
  suffix?: string;
  importance?: "high" | "medium" | "low" | string;
  options?: string[];
  is_multi?: boolean;
  dependency?: FieldDependency;
  [key: string]: unknown;
}

export interface SymptomItemSchema {
  key: string;
  display_name: string;
  icd10_code: string;
  category?: string;
  clinical_term?: string;
  synonyms?: string[];
  search_keywords?: string[];
  fields: SymptomFieldSchema[];
}

export interface SymptomsSectionSchema {
  section: "symptoms";
  ui_type: string;
  meta?: {
    rules?: {
      no_hard_required?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  items: SymptomItemSchema[];
}

