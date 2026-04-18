import { coerceValueForField } from "./coerce";
import type { TemplateField } from "./types";
import type { TemplateMeta } from "./types";

/**
 * Defaults for apply_on init only — caller must invoke once at catalog add, not on reopen.
 */
export function extractApplyOnInitDefaults(
  fields: TemplateField[] | undefined,
  _meta?: TemplateMeta | null
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields?.length) return out;

  for (const field of fields) {
    const d = field.default as { value?: unknown; apply_on?: string[] } | undefined;
    if (!d || !Object.prototype.hasOwnProperty.call(d, "value")) continue;
    const apply = Array.isArray(d.apply_on) ? d.apply_on : [];
    if (!apply.includes("init")) continue;
    out[field.key] = coerceValueForField(field, d.value);
  }

  return out;
}
