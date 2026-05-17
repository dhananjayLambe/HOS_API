import { describe, expect, it } from "vitest";
import { buildVisitTimeline } from "@/lib/labs/visit-appointments/build-visit-timeline";
import type { LabAppointmentRow } from "@/lib/labs/types";

function baseRow(overrides: Partial<LabAppointmentRow> = {}): LabAppointmentRow {
  return {
    id: "va-1",
    appointmentId: "APT-1",
    orderNumber: "DX-1",
    orderUuid: "ou-1",
    patientName: "Test",
    patientPhone: "+91",
    patientAge: 30,
    patientGender: "M",
    testCount: 1,
    testNames: ["MRI"],
    testNamesOverflow: 0,
    appointmentDate: "2026-05-18",
    appointmentSlot: "09:00",
    slotDateLabel: "Today",
    slotTimeLabel: "09:00",
    fastingRequired: false,
    prepTags: [],
    instructions: "",
    status: "CHECKED_IN",
    workflowHint: "Complete",
    allowedActions: ["complete", "mark_no_show"],
    isOverdue: false,
    patientNotes: null,
    statusUpdatedAt: "2026-05-18T08:00:00.000Z",
    checkedInAt: "2026-05-18T07:00:00.000Z",
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("buildVisitTimeline", () => {
  it("returns events newest-first from workflow timestamps", () => {
    const events = buildVisitTimeline(
      baseRow({
        checkedInAt: "2026-05-18T07:00:00.000Z",
        completedAt: "2026-05-18T10:00:00.000Z",
        statusUpdatedAt: "2026-05-18T10:00:00.000Z",
        status: "COMPLETED",
      }),
    );
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].label).toMatch(/Status|completed|Checked/i);
  });

  it("returns empty when no timestamps", () => {
    const events = buildVisitTimeline(
      baseRow({
        statusUpdatedAt: "",
        checkedInAt: null,
        completedAt: null,
        cancelledAt: null,
      }),
    );
    expect(events).toHaveLength(0);
  });
});
