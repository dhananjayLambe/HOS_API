import { describe, expect, it } from "vitest";
import {
  clinicalStatusTone,
  formatArtifactTabLabel,
} from "@/lib/design-system/clinical";

describe("formatArtifactTabLabel", () => {
  it("strips pdf and title-cases", () => {
    expect(formatArtifactTabLabel("CBC Report.pdf")).toBe("CBC Report");
    expect(formatArtifactTabLabel("Peripheral smear.jpg")).toBe(
      "Peripheral Smear"
    );
  });

  it("keeps acronyms and returns Report for empty", () => {
    expect(formatArtifactTabLabel("ECG Trace.pdf")).toBe("ECG Trace");
    expect(formatArtifactTabLabel(".pdf")).toBe("Report");
  });
});

describe("clinicalStatusTone", () => {
  it("maps statuses to tones", () => {
    expect(clinicalStatusTone("AVAILABLE")).toBe("available");
    expect(clinicalStatusTone("AWAITING_REPORT")).toBe("awaiting");
    expect(clinicalStatusTone("UPDATED")).toBe("updated");
  });
});
