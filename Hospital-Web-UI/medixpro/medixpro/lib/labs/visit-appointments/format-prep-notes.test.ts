import { describe, expect, it } from "vitest";
import { formatPrepNotesDisplay } from "@/lib/labs/visit-appointments/format-prep-notes";
import type { LabAppointmentRow } from "@/lib/labs/types";

function minimalRow(overrides: Partial<LabAppointmentRow> = {}): LabAppointmentRow {
  return {
    id: "1",
    appointmentId: "APT-1",
    orderNumber: "O-1",
    orderUuid: "ou-1",
    patientName: "P",
    patientPhone: "",
    patientAge: null,
    patientGender: "",
    testCount: 0,
    testNames: [],
    testNamesOverflow: 0,
    appointmentDate: "2026-05-18",
    appointmentSlot: "",
    slotDateLabel: "",
    slotTimeLabel: "",
    fastingRequired: false,
    prepTags: [],
    instructions: "Long instruction text",
    status: "PENDING",
    workflowHint: "",
    allowedActions: [],
    isOverdue: false,
    patientNotes: null,
    statusUpdatedAt: "",
    confirmedAt: null,
    checkedInAt: null,
    completedAt: null,
    noShowAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("formatPrepNotesDisplay", () => {
  it("prefers prepSummary over instructions", () => {
    const { instructionLine } = formatPrepNotesDisplay(
      minimalRow({
        prepSummary: "Fasting · Contrast",
        instructions: "6h fasting required",
      }),
    );
    expect(instructionLine).toBe("Fasting · Contrast");
  });

  it("falls back to instructions when prepSummary empty", () => {
    const { instructionLine } = formatPrepNotesDisplay(
      minimalRow({
        prepSummary: "",
        instructions: "  Bring reports  ",
      }),
    );
    expect(instructionLine).toBe("Bring reports");
  });
});
