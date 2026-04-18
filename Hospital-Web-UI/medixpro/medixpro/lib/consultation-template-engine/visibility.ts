import { evaluateCondition } from "./conditions";
import type { ConditionNode, SingleCondition, TemplateField } from "./types";

/**
 * Whether the field should be shown (template visibility + legacy dependency).
 */
export function evaluateVisibility(
  field: TemplateField,
  values: Record<string, unknown>
): boolean {
  const vis = field.visibility;
  if (vis?.depends_on) {
    return evaluateCondition(
      vis.depends_on as ConditionNode | SingleCondition,
      values
    );
  }

  if (field.dependency) {
    const current = values[field.dependency.field];
    if (field.dependency.operator === "equals") {
      return current === field.dependency.value;
    }
    return true;
  }

  return true;
}
