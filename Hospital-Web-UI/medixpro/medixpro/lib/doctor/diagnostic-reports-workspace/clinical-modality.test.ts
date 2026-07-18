import { describe, expect, it } from "vitest";
import {
  matchesClinicalModality,
  resolveClinicalModality,
} from "./clinical-modality";

describe("clinical modality map", () => {
  it("resolves laboratory from category code", () => {
    expect(resolveClinicalModality("LAB")).toBe("laboratory");
    expect(resolveClinicalModality("HEMATOLOGY")).toBe("laboratory");
  });

  it("resolves radiology from test name keywords", () => {
    expect(resolveClinicalModality(null, "Chest X-Ray")).toBe("radiology");
    expect(resolveClinicalModality("Imaging", "MRI Brain")).toBe("radiology");
  });

  it("resolves cardiology and pathology", () => {
    expect(resolveClinicalModality(null, "ECG")).toBe("cardiology");
    expect(resolveClinicalModality("Histopathology", "Biopsy")).toBe(
      "pathology"
    );
  });

  it("returns null for unknown categories", () => {
    expect(resolveClinicalModality("Miscellaneous")).toBeNull();
  });

  it("matchesClinicalModality filters correctly", () => {
    expect(matchesClinicalModality("LAB", "CBC", "laboratory")).toBe(true);
    expect(matchesClinicalModality("LAB", "CBC", "radiology")).toBe(false);
    expect(matchesClinicalModality("LAB", "CBC", null)).toBe(true);
  });
});
