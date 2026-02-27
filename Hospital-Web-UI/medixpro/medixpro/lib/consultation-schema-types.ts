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

// Findings reuse the same field/item structure as symptoms
export type FindingFieldSchema = SymptomFieldSchema;
export type FindingItemSchema = SymptomItemSchema;

export interface FindingsSectionSchema {
  section: "findings";
  ui_type: string;
  meta?: {
    rules?: {
      no_hard_required?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  items: FindingItemSchema[];
}

export interface DiagnosisItemSchema extends SymptomItemSchema {
  chronic?: boolean;
  diagnosis_type?: string;
  severity_supported?: boolean;
  parent_code?: string | null;
  is_primary_allowed?: boolean;
}

export interface DiagnosisSectionSchema {
  section: "diagnosis";
  ui_type: string;
  meta?: {
    rules?: {
      provisional_default?: boolean;
      multiple_diagnosis_supported?: boolean;
      free_text_always_allowed?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  items: DiagnosisItemSchema[];
}

// Instructions (template-driven, specialty-aware)
export interface InstructionFieldSchema {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "radio" | string;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
  options?: string[];
  [key: string]: unknown;
}

export interface InstructionItemSchema {
  id?: string;
  key: string;
  label: string;
  category_code: string;
  requires_input: boolean;
  input_schema?: { fields: InstructionFieldSchema[] };
  display_order?: number;
}

export interface InstructionCategorySchema {
  id: string;
  code: string;
  name: string;
  display_order: number;
}

export interface InstructionsSectionSchema {
  section: "instructions";
  ui_type: string;
  meta?: Record<string, unknown>;
  categories: InstructionCategorySchema[];
  items: InstructionItemSchema[];
}

// API response: single encounter instruction (added)
export interface EncounterInstructionRow {
  id: string;
  instruction_template_id: string;
  label: string;
  input_data: Record<string, unknown>;
  custom_note: string | null;
  is_active: boolean;
}



