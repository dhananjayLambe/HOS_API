import type { TemplateField } from "./types";

/**
 * Coerce raw UI / JSON values before validation (template-driven).
 */
export function coerceValue(
  type: string | undefined,
  value: unknown,
  isMulti?: boolean
): unknown {
  if (value === undefined || value === null) return value;

  const t = (type ?? "text").toLowerCase();

  if (isMulti || t === "multi-select") {
    if (Array.isArray(value)) return value;
    if (value === "") return [];
    return [value];
  }

  if (t === "number") {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (value === "") return "";
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }

  if (t === "toggle") {
    return Boolean(value);
  }

  if (
    t === "text" ||
    t === "textarea" ||
    t === "select" ||
    t === "radio" ||
    t === "date"
  ) {
    return typeof value === "string" ? value : String(value);
  }

  return value;
}

export function coerceValueForField(field: TemplateField, value: unknown): unknown {
  const isMulti = Boolean(field.is_multi);
  const t = typeof field.type === "string" ? field.type : "text";
  return coerceValue(t, value, isMulti);
}
