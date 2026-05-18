import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VisitAppointmentRowActions } from "@/components/labs/visit-appointments/VisitAppointmentRowActions";
import { VISIT_ACTION_LABELS } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";

function baseRow(allowedActions: LabAppointmentRow["allowedActions"]): LabAppointmentRow {
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
    status: "PENDING",
    workflowHint: "Confirm",
    allowedActions,
    isOverdue: false,
    patientNotes: null,
    statusUpdatedAt: "2026-05-18T08:00:00.000Z",
    confirmedAt: null,
    checkedInAt: null,
    completedAt: null,
    noShowAt: null,
    cancelledAt: null,
  };
}

function renderActions(props: Parameters<typeof VisitAppointmentRowActions>[0]) {
  return render(createElement(VisitAppointmentRowActions, props));
}

describe("VisitAppointmentRowActions allowed_actions rendering", () => {
  it("renders only backend-allowed action buttons", () => {
    renderActions({
      row: baseRow(["confirm", "mark_no_show"]),
      onConfirm: vi.fn(),
      onCheckIn: vi.fn(),
      onComplete: vi.fn(),
      onMarkNoShow: vi.fn(),
      onReschedule: vi.fn(),
    });
    expect(screen.getByRole("button", { name: VISIT_ACTION_LABELS.confirm })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: VISIT_ACTION_LABELS.mark_no_show })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: VISIT_ACTION_LABELS.check_in })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: VISIT_ACTION_LABELS.reschedule })).not.toBeInTheDocument();
  });

  it("renders check-in and complete when allowed", () => {
    renderActions({
      row: baseRow(["check_in", "mark_no_show", "reschedule"]),
      onConfirm: vi.fn(),
      onCheckIn: vi.fn(),
      onComplete: vi.fn(),
      onMarkNoShow: vi.fn(),
      onReschedule: vi.fn(),
    });
    expect(screen.getByRole("button", { name: VISIT_ACTION_LABELS.check_in })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: VISIT_ACTION_LABELS.reschedule })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: VISIT_ACTION_LABELS.confirm })).not.toBeInTheDocument();
  });

  it("renders no actions when allowed_actions is empty", () => {
    const { container } = renderActions({
      row: baseRow([]),
      onConfirm: vi.fn(),
      onCheckIn: vi.fn(),
      onComplete: vi.fn(),
      onMarkNoShow: vi.fn(),
      onReschedule: vi.fn(),
    });
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("disables all buttons when busy", () => {
    renderActions({
      row: baseRow(["confirm"]),
      busy: true,
      onConfirm: vi.fn(),
      onCheckIn: vi.fn(),
      onComplete: vi.fn(),
      onMarkNoShow: vi.fn(),
      onReschedule: vi.fn(),
    });
    expect(screen.getByRole("button", { name: VISIT_ACTION_LABELS.confirm })).toBeDisabled();
  });

  it("invokes the matching handler when an allowed action is clicked", () => {
    const onConfirm = vi.fn();
    const row = baseRow(["confirm"]);
    renderActions({
      row,
      onConfirm,
      onCheckIn: vi.fn(),
      onComplete: vi.fn(),
      onMarkNoShow: vi.fn(),
      onReschedule: vi.fn(),
    });
    fireEvent.click(screen.getByRole("button", { name: VISIT_ACTION_LABELS.confirm }));
    expect(onConfirm).toHaveBeenCalledWith(row);
  });
});
