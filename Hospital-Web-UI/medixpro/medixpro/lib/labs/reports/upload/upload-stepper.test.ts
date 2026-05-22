import { describe, expect, it } from "vitest";
import { stepperIndex, stepperItemA11y } from "@/lib/labs/reports/upload/upload-stepper";

describe("upload-stepper", () => {
  it("maps workflow steps to indices", () => {
    expect(stepperIndex("files", true)).toBe(0);
    expect(stepperIndex("preview", true)).toBe(1);
    expect(stepperIndex("success", true)).toBe(-1);
  });

  it("aria-current on active step", () => {
    expect(stepperItemA11y(1, 1, false, false)).toEqual({ "aria-current": "step" });
    expect(stepperItemA11y(2, 1, false, false)).toEqual({ "aria-disabled": true });
  });
});
