import type { TemplateMeta } from "./types";

const DEFAULT_EMPTY: unknown[] = [null, undefined, "", []];

/**
 * Central empty check for template-driven logic (validation, prune, required).
 */
export function isEmpty(value: unknown, meta?: TemplateMeta | null): boolean {
  const list = meta?.empty_values;
  const emptyValues = Array.isArray(list) && list.length > 0 ? list : DEFAULT_EMPTY;

  for (const ev of emptyValues) {
    if (ev === null && value === null) return true;
    if (ev === "" && value === "") return true;
    if (Array.isArray(ev) && ev.length === 0 && Array.isArray(value) && value.length === 0) {
      return true;
    }
  }

  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}
