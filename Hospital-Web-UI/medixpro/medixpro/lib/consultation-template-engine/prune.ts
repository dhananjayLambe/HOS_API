import { isEmpty } from "./empty";
import { evaluateVisibility } from "./visibility";
import type { TemplateItemSchema, TemplateMeta } from "./types";

export type PruneOptions = Record<string, never>;

/**
 * Remove hidden template fields and empty values. Flat shape unchanged (only keys dropped).
 */
export function prunePayload(
  values: Record<string, unknown>,
  schemaItem: TemplateItemSchema | undefined | null,
  meta?: TemplateMeta | null,
  _options?: PruneOptions
): Record<string, unknown> {
  const fields = schemaItem?.fields ?? [];
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(values)) {
    const field = fields.find((f) => f.key === k);
    if (field && !evaluateVisibility(field, values)) {
      continue;
    }
    if (isEmpty(v, meta)) {
      continue;
    }
    out[k] = v;
  }

  return out;
}
