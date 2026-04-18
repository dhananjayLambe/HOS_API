/**
 * Loose types for V4.1 JSON templates (symptoms / findings render-schema items).
 */

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "includes";

export type SingleCondition = {
  field: string;
  operator: ConditionOperator;
  value: unknown;
};

export type ConditionNode =
  | SingleCondition
  | {
      logic: "AND" | "OR";
      conditions: ConditionNode[];
    };

export type TemplateField = {
  key: string;
  type?: string;
  label?: string;
  is_multi?: boolean;
  /** Legacy */
  dependency?: { field: string; operator: string; value: unknown };
  visibility?: {
    depends_on?: ConditionNode | SingleCondition;
    clear_on_hide?: boolean;
  };
  validation?: Record<string, unknown>;
  required?: boolean | string;
  min?: number;
  max?: number;
  default?: { value?: unknown; apply_on?: string[] };
  [key: string]: unknown;
};

export type TemplateMeta = {
  empty_values?: unknown[];
  validation_defaults?: { skip_if_hidden?: boolean; severity?: string };
  [key: string]: unknown;
};

export type TemplateItemSchema = {
  key?: string;
  fields?: TemplateField[];
  rules?: Array<{
    type?: string;
    condition?: ConditionNode;
    message?: string;
  }>;
  [key: string]: unknown;
};
