import type { ConditionNode, SingleCondition } from "./types";

function getFieldValue(values: Record<string, unknown>, field: string): unknown {
  if (Object.prototype.hasOwnProperty.call(values, field)) {
    return values[field];
  }
  return undefined;
}

function compareSingle(
  current: unknown,
  operator: SingleCondition["operator"],
  expected: unknown
): boolean {
  switch (operator) {
    case "equals":
      return current === expected;
    case "not_equals":
      return current !== expected;
    case "greater_than": {
      const a = typeof current === "number" ? current : Number(current);
      const b = typeof expected === "number" ? expected : Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    case "less_than": {
      const a = typeof current === "number" ? current : Number(current);
      const b = typeof expected === "number" ? expected : Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
    }
    case "includes":
      if (Array.isArray(current)) {
        return current.includes(expected);
      }
      if (typeof current === "string") {
        return String(expected).length > 0 && current.includes(String(expected));
      }
      return false;
    default:
      return false;
  }
}

/**
 * Evaluate a single condition or nested AND/OR tree against flat values.
 */
export function evaluateCondition(
  node: ConditionNode | SingleCondition | undefined,
  values: Record<string, unknown>
): boolean {
  if (!node || typeof node !== "object") return true;

  if ("logic" in node && Array.isArray(node.conditions)) {
    const parts = node.conditions.map((c) => evaluateCondition(c, values));
    return node.logic === "OR" ? parts.some(Boolean) : parts.every(Boolean);
  }

  const sc = node as SingleCondition;
  if (!sc.field || !sc.operator) return true;
  const current = getFieldValue(values, sc.field);
  return compareSingle(current, sc.operator, sc.value);
}
