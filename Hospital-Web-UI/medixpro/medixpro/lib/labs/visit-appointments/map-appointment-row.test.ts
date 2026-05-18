import { describe, expect, it } from "vitest";
import {
  mapVisitAppointmentListItem,
  patchRowFromWorkflow,
} from "@/lib/labs/visit-appointments/map-appointment-row";
import type { VisitAppointmentListItem } from "@/lib/labs/api/visit-appointments-types";
import type { LabAppointmentRow } from "@/lib/labs/types";

const listDto: VisitAppointmentListItem = {
  id: "00000000-0000-0000-0000-000000000001",
  appointment_id: "APT-ABC",
  order_number: "ORD-1",
  order_uuid: "00000000-0000-0000-0000-000000000002",
  patient_name: "Jane Doe",
  patient_phone: "+919999999999",
  patient_age: 40,
  patient_gender: "F",
  test_count: 2,
  test_names: ["CBC", "Lipid"],
  test_names_overflow: 0,
  appointment_date: "2026-05-20",
  appointment_slot: "10:00",
  slot_date_label: "Tomorrow",
  slot_time_label: "10:00",
  fasting_required: true,
  prep_tags: ["Fasting"],
  prep_summary: "Fasting · Contrast",
  instructions: "6h fasting",
  appointment_status: "CONFIRMED",
  workflow_hint: "Patient appointment confirmed",
  allowed_actions: ["check_in", "mark_no_show", "reschedule"],
  patient_notes: null,
  status_updated_at: "2026-05-19T10:00:00.000Z",
  confirmed_at: "2026-05-19T09:00:00.000Z",
  checked_in_at: null,
  completed_at: null,
  no_show_at: null,
  cancelled_at: null,
  timeline_events: [],
};

function baseRow(): LabAppointmentRow {
  return mapVisitAppointmentListItem(listDto);
}

describe("mapVisitAppointmentListItem", () => {
  it("preserves backend workflow hint and allowed actions", () => {
    const row = mapVisitAppointmentListItem(listDto);
    expect(row.workflowHint).toBe("Patient appointment confirmed");
    expect(row.allowedActions).toEqual(["check_in", "mark_no_show", "reschedule"]);
    expect(row.prepSummary).toBe("Fasting · Contrast");
  });
});

describe("patchRowFromWorkflow", () => {
  it("updates status, actions, hint, and audit timestamps from workflow response", () => {
    const row = baseRow();
    const patched = patchRowFromWorkflow(row, {
      success: true,
      appointment_status: "CHECKED_IN",
      message: "Patient checked in.",
      appointment_id: row.id,
      allowed_actions: ["complete", "mark_no_show"],
      workflow_hint: "Patient checked in",
      status_updated_at: "2026-05-19T11:00:00.000Z",
      confirmed_at: "2026-05-19T09:00:00.000Z",
      checked_in_at: "2026-05-19T11:00:00.000Z",
      completed_at: null,
      no_show_at: null,
      cancelled_at: null,
    });
    expect(patched.status).toBe("CHECKED_IN");
    expect(patched.allowedActions).toEqual(["complete", "mark_no_show"]);
    expect(patched.workflowHint).toBe("Patient checked in");
    expect(patched.checkedInAt).toBe("2026-05-19T11:00:00.000Z");
    expect(patched.confirmedAt).toBe("2026-05-19T09:00:00.000Z");
  });

  it("patches no_show_at on mark no show", () => {
    const row = baseRow();
    const patched = patchRowFromWorkflow(row, {
      success: true,
      appointment_status: "NO_SHOW",
      message: "Marked as no show.",
      appointment_id: row.id,
      allowed_actions: [],
      workflow_hint: "Patient did not arrive",
      status_updated_at: "2026-05-19T12:00:00.000Z",
      confirmed_at: row.confirmedAt,
      checked_in_at: null,
      completed_at: null,
      no_show_at: "2026-05-19T12:00:00.000Z",
      cancelled_at: "2026-05-19T12:00:00.000Z",
    });
    expect(patched.noShowAt).toBe("2026-05-19T12:00:00.000Z");
    expect(patched.allowedActions).toEqual([]);
  });

  it("does not clear audit fields when response omits them", () => {
    const row = baseRow();
    const patched = patchRowFromWorkflow(row, {
      success: true,
      appointment_status: "CONFIRMED",
      message: "ok",
      appointment_id: row.id,
      allowed_actions: ["check_in"],
      workflow_hint: "hint",
      status_updated_at: "2026-05-19T10:30:00.000Z",
    });
    expect(patched.confirmedAt).toBe(row.confirmedAt);
    expect(patched.checkedInAt).toBe(row.checkedInAt);
  });
});
