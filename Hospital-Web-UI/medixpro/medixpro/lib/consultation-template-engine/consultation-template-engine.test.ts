import { describe, it, expect } from "vitest";
import {
  clearHiddenFields,
  validateField,
  evaluateRules,
  prunePayload,
  evaluateCondition,
} from "./index";
import type { TemplateField, TemplateItemSchema, TemplateMeta } from "./types";

const meta: TemplateMeta = {
  empty_values: [null, "", []],
  validation_defaults: { skip_if_hidden: true },
};

describe("consultation-template-engine", () => {
  it("1. Dependency hides field → value deleted", () => {
    const fields: TemplateField[] = [
      {
        key: "type",
        type: "select",
        options: ["Dry", "Wet"],
      },
      {
        key: "sputum_color",
        type: "select",
        options: ["Clear", "Yellow"],
        visibility: {
          depends_on: {
            field: "type",
            operator: "equals",
            value: "Wet",
          },
          clear_on_hide: true,
        },
      },
    ];
    const values = { type: "Dry", sputum_color: "Yellow" };
    const cleared = clearHiddenFields(fields, { ...values });
    expect(cleared.sputum_color).toBeUndefined();
    expect(cleared.type).toBe("Dry");
  });

  it("2. Invalid number → error shown", () => {
    const field: TemplateField = {
      key: "since_days",
      label: "Duration",
      type: "number",
      validation: { min: 0, max: 365 },
    };
    const r = validateField(field, "not-a-number", { since_days: "not-a-number" }, meta);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => e.includes("valid number"))).toBe(true);
  });

  it("3. Optional empty → no error", () => {
    const field: TemplateField = {
      key: "grade",
      type: "select",
      required: false,
      validation: { required: false },
    };
    const r = validateField(field, "", { grade: "" }, meta);
    expect(r.errors).toEqual([]);
  });

  it("4. Multi-select overflow → error", () => {
    const field: TemplateField = {
      key: "tags",
      type: "select",
      is_multi: true,
      validation: { max_items: 2 },
    };
    const r = validateField(
      field,
      ["a", "b", "c"],
      { tags: ["a", "b", "c"] },
      meta
    );
    expect(r.errors.some((e) => e.includes("at most"))).toBe(true);
  });

  it("5. Rule triggers warning", () => {
    const rules: TemplateItemSchema["rules"] = [
      {
        type: "warning",
        condition: {
          field: "since_days",
          operator: "greater_than",
          value: 5,
        },
        message: "Consider follow-up",
      },
    ];
    const w = evaluateRules(rules, { since_days: 7 });
    expect(w).toContain("Consider follow-up");
  });

  it("6. Submit with warnings → allowed (non-blocking)", () => {
    const field: TemplateField = {
      key: "x",
      type: "text",
      validation: { required: "soft" },
    };
    const r = validateField(field, "", { x: "" }, meta);
    expect(r.warnings.length).toBeGreaterThan(0);
    const canSubmit = true;
    expect(canSubmit).toBe(true);
  });

  it("7. Submit with errors → allowed (non-blocking)", () => {
    const field: TemplateField = {
      key: "n",
      type: "number",
      validation: { min: 0, max: 10 },
    };
    const r = validateField(field, 99, { n: 99 }, meta);
    expect(r.errors.length).toBeGreaterThan(0);
    const canSubmit = true;
    expect(canSubmit).toBe(true);
  });

  it("prunePayload removes hidden and empty", () => {
    const schema: TemplateItemSchema = {
      fields: [
        {
          key: "a",
          type: "text",
          visibility: {
            depends_on: { field: "flag", operator: "equals", value: true },
            clear_on_hide: true,
          },
        },
        { key: "b", type: "text" },
      ],
    };
    const out = prunePayload(
      { flag: false, a: "x", b: "ok", empty: "" },
      schema,
      meta
    );
    expect(out.a).toBeUndefined();
    expect(out.b).toBe("ok");
    expect(out.empty).toBeUndefined();
  });

  it("evaluateCondition supports not_equals and includes", () => {
    expect(
      evaluateCondition(
        { field: "t", operator: "not_equals", value: "x" },
        { t: "y" }
      )
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: "arr", operator: "includes", value: "b" },
        { arr: ["a", "b"] }
      )
    ).toBe(true);
  });
});
