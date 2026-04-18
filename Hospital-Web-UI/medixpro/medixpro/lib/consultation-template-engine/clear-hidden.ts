import { evaluateVisibility } from "./visibility";
import type { TemplateField } from "./types";
/**
 * Remove values for fields that are hidden when clear_on_hide is true.
 * Returns a new object; does not mutate the input.
 */
export function clearHiddenFields(
  fields: TemplateField[] | undefined,
  values: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...values };
  if (!fields?.length) return out;

  for (const field of fields) {
    const visible = evaluateVisibility(field, out);
    if (visible) continue;

    const clear =
      field.visibility && Object.prototype.hasOwnProperty.call(field.visibility, "clear_on_hide")
        ? field.visibility.clear_on_hide === true
        : false;

    if (clear && field.key in out) {
      delete out[field.key];
    }
  }

  return out;
}
