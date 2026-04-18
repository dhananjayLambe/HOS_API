import { evaluateCondition } from "./conditions";
import type { ConditionNode, SingleCondition, TemplateItemSchema } from "./types";

/**
 * Clinical / template warnings from item-level rules. Never blocking.
 */
export function evaluateRules(
  rules: TemplateItemSchema["rules"] | undefined,
  values: Record<string, unknown>
): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(rules)) return warnings;

  for (const rule of rules) {
    const t = rule.type ?? "warning";
    if (t !== "warning" && t !== "") continue;
    if (!rule.condition || !rule.message) continue;
    if (
      evaluateCondition(rule.condition as ConditionNode | SingleCondition, values)
    ) {
      warnings.push(rule.message);
    }
  }

  return warnings;
}
