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
    confirmedAt: null,
    checkedInAt: "2026-05-18T07:00:00.000Z",
    completedAt: null,
    noShowAt: null,
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

  it("prefers API timeline_events when present", () => {
    const events = buildVisitTimeline(
      baseRow({
        timelineEvents: [
          {
            event: "confirmed",
            raw_event: "confirmed",
            timestamp: "2026-05-18T08:00:00.000Z",
            label: "Appointment confirmed",
            detail: "",
            event_order: 0,
          },
          {
            event: "checked_in",
            raw_event: "checked_in",
            timestamp: "2026-05-18T09:00:00.000Z",
            label: "Patient checked in",
            detail: "Arrived",
            event_order: 1,
          },
        ],
      }),
    );
    expect(events).toHaveLength(2);
    expect(events[0].label).toBe("Patient checked in");
    expect(events[0].detail).toBe("Arrived");
    expect(events[1].label).toBe("Appointment confirmed");
  });

  it("returns empty when no timestamps", () => {
    const events = buildVisitTimeline(
      baseRow({
        statusUpdatedAt: "",
        confirmedAt: null,
        checkedInAt: null,
        completedAt: null,
        noShowAt: null,
        cancelledAt: null,
      }),
    );
    expect(events).toHaveLength(0);
  });

  it("includes confirmed and no_show in audit fallback", () => {
    const events = buildVisitTimeline(
      baseRow({
        timelineEvents: undefined,
        status: "NO_SHOW",
        confirmedAt: "2026-05-18T06:00:00.000Z",
        noShowAt: "2026-05-18T12:00:00.000Z",
        checkedInAt: null,
        completedAt: null,
        statusUpdatedAt: "2026-05-18T12:00:00.000Z",
        patientNotes: "Absent",
      }),
    );
    expect(events.some((e) => e.label === "Appointment confirmed")).toBe(true);
    expect(events.some((e) => e.label === "Patient did not arrive")).toBe(true);
    expect(events[0].label).toBe("Patient did not arrive");
  });

  it("omits generic Status event when confirmed shares statusUpdatedAt", () => {
    const ts = "2026-05-18T08:00:00.000Z";
    const events = buildVisitTimeline(
      baseRow({
        timelineEvents: undefined,
        status: "CONFIRMED",
        confirmedAt: ts,
        statusUpdatedAt: ts,
        checkedInAt: null,
        completedAt: null,
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe("Appointment confirmed");
    expect(events.some((e) => e.label.startsWith("Status ·"))).toBe(false);
  });

  it("renders rescheduled event from API timeline_events", () => {
    const events = buildVisitTimeline(
      baseRow({
        timelineEvents: [
          {
            event: "rescheduled",
            raw_event: "rescheduled",
            timestamp: "2026-05-18T11:00:00.000Z",
            label: "Appointment rescheduled",
            detail: "New slot 14:00",
            event_order: 0,
          },
        ],
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe("Appointment rescheduled");
    expect(events[0].detail).toBe("New slot 14:00");
  });
});
