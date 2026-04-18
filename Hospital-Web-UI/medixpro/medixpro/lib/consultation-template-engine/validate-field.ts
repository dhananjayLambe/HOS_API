import { coerceValueForField } from "./coerce";
import { evaluateCondition } from "./conditions";
import { evaluateVisibility } from "./visibility";
import { isEmpty } from "./empty";
import type { ConditionNode, SingleCondition, TemplateField, TemplateMeta } from "./types";

export type FieldValidationResult = {
  errors: string[];
  warnings: string[];
};

function mergeValidation(field: TemplateField): Record<string, unknown> {
  const v = { ...(field.validation ?? {}) };
  if (field.required !== undefined && v.required === undefined) {
    v.required = field.required;
  }
  if (field.min !== undefined && v.min === undefined) v.min = field.min;
  if (field.max !== undefined && v.max === undefined) v.max = field.max;
  return v;
}

/**
 * Template-driven validation. Errors/warnings are informational only — never block consultation in UI.
 */
export function validateField(
  field: TemplateField,
  rawValue: unknown,
  values: Record<string, unknown>,
  meta?: TemplateMeta | null
): FieldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = field.label ?? field.key;

  const visible = evaluateVisibility(field, values);
  if (!visible) {
    return { errors, warnings };
  }

  const valBlock = field.validation as
    | {
        depends_on?: ConditionNode | SingleCondition;
        skip_if_hidden?: boolean;
        required?: boolean | string;
        min?: number;
        max?: number;
        min_items?: number;
        max_items?: number;
        max_length?: number;
      }
    | undefined;

  if (valBlock?.depends_on) {
    const ok = evaluateCondition(valBlock.depends_on, values);
    if (!ok) {
      return { errors, warnings };
    }
  }

  const merged = mergeValidation(field);
  const coerced = coerceValueForField(field, rawValue);
  const empty = isEmpty(coerced, meta);

  const req = merged.required;
  if (req === true && empty) {
    errors.push(`${label} is required`);
  } else if (req === "soft" && empty) {
    warnings.push(`${label} is recommended`);
  }

  const fieldType = (field.type ?? "text").toLowerCase();

  if (!empty && fieldType === "number") {
    const n =
      typeof coerced === "number"
        ? coerced
        : typeof coerced === "string" && coerced !== ""
          ? Number(coerced)
          : NaN;
    if (Number.isNaN(n)) {
      errors.push(`${label} must be a valid number`);
    } else {
      const minV = typeof merged.min === "number" ? merged.min : undefined;
      const maxV = typeof merged.max === "number" ? merged.max : undefined;
      if (minV !== undefined && n < minV) {
        errors.push(`${label} must be at least ${minV}`);
      }
      if (maxV !== undefined && n > maxV) {
        errors.push(`${label} must be at most ${maxV}`);
      }
    }
  }

  if (field.is_multi || (fieldType === "select" && field.is_multi)) {
    const arr = Array.isArray(coerced) ? coerced : [];
    const minItems = typeof merged.min_items === "number" ? merged.min_items : undefined;
    const maxItems = typeof merged.max_items === "number" ? merged.max_items : undefined;
    if (minItems !== undefined && arr.length < minItems) {
      errors.push(`${label} requires at least ${minItems} selection(s)`);
    }
    if (maxItems !== undefined && arr.length > maxItems) {
      errors.push(`${label} allows at most ${maxItems} selection(s)`);
    }
  }

  if (!empty && (fieldType === "text" || fieldType === "textarea")) {
    const s = String(coerced);
    const maxLen = typeof merged.max_length === "number" ? merged.max_length : undefined;
    if (maxLen !== undefined && s.length > maxLen) {
      errors.push(`${label} must be at most ${maxLen} characters`);
    }
  }

  return { errors, warnings };
}
