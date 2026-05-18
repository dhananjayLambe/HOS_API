import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppointmentDetailTimelineSection } from "@/components/labs/visit-appointments/AppointmentDetailTimelineSection";
import type { LabAppointmentRow } from "@/lib/labs/types";

function baseRow(overrides: Partial<LabAppointmentRow> = {}): LabAppointmentRow {
  return {
    id: "va-1",
    appointmentId: "APT-1",
    orderNumber: "ORD-1",
    orderUuid: "ou-1",
    patientName: "Jane",
    patientPhone: "+91",
    patientAge: 30,
    patientGender: "F",
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
    allowedActions: ["complete"],
    isOverdue: false,
    patientNotes: null,
    statusUpdatedAt: "2026-05-18T08:00:00.000Z",
    confirmedAt: "2026-05-18T07:00:00.000Z",
    checkedInAt: "2026-05-18T08:00:00.000Z",
    completedAt: null,
    noShowAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("AppointmentDetailTimelineSection", () => {
  it("renders section heading", () => {
    render(createElement(AppointmentDetailTimelineSection, { row: baseRow() }));
    expect(screen.getByRole("heading", { name: "Visit timeline" })).toBeInTheDocument();
  });

  it("shows empty state when no workflow timestamps", () => {
    render(
      createElement(AppointmentDetailTimelineSection, {
        row: baseRow({
          statusUpdatedAt: "",
          confirmedAt: null,
          checkedInAt: null,
          completedAt: null,
          noShowAt: null,
          cancelledAt: null,
        }),
      }),
    );
    expect(screen.getByText("No workflow events yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Confirm, check-in, and complete actions will appear here/),
    ).toBeInTheDocument();
  });

  it("renders API timeline_events labels newest-first", () => {
    render(
      createElement(AppointmentDetailTimelineSection, {
        row: baseRow({
          timelineEvents: [
            {
              event: "confirmed",
              raw_event: "confirmed",
              timestamp: "2026-05-18T07:00:00.000Z",
              label: "Appointment confirmed",
              detail: "",
              event_order: 0,
            },
            {
              event: "checked_in",
              raw_event: "checked_in",
              timestamp: "2026-05-18T08:00:00.000Z",
              label: "Patient checked in",
              detail: "Front desk",
              event_order: 1,
            },
          ],
        }),
      }),
    );
    expect(screen.getByText("Patient checked in")).toBeInTheDocument();
    expect(screen.getByText("Front desk")).toBeInTheDocument();
    expect(screen.getByText("Appointment confirmed")).toBeInTheDocument();
  });

  it("falls back to audit timestamps when timeline_events absent", () => {
    render(
      createElement(AppointmentDetailTimelineSection, {
        row: baseRow({
          timelineEvents: undefined,
          status: "NO_SHOW",
          confirmedAt: "2026-05-18T06:00:00.000Z",
          noShowAt: "2026-05-18T12:00:00.000Z",
          checkedInAt: null,
          completedAt: null,
          statusUpdatedAt: "2026-05-18T12:00:00.000Z",
        }),
      }),
    );
    expect(screen.getByText("Patient did not arrive")).toBeInTheDocument();
    expect(screen.getByText("Appointment confirmed")).toBeInTheDocument();
  });
});
