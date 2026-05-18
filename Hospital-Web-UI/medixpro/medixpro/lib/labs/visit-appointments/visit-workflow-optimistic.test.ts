import { describe, expect, it } from "vitest";
import type { VisitAppointmentWorkflowResponse } from "@/lib/labs/api/visit-appointments-types";
import { appointmentMatchesTab } from "@/lib/labs/visit-appointments/build-visit-appointments-query";
import {
  mapVisitAppointmentListItem,
  patchRowFromWorkflow,
} from "@/lib/labs/visit-appointments/map-appointment-row";
import type { VisitAppointmentListItem } from "@/lib/labs/api/visit-appointments-types";

const scheduledDto: VisitAppointmentListItem = {
  id: "va-1",
  appointment_id: "APT-1",
  order_number: "ORD-1",
  order_uuid: "ou-1",
  patient_name: "Jane",
  patient_phone: "+91",
  patient_age: 30,
  patient_gender: "F",
  test_count: 1,
  test_names: ["MRI"],
  test_names_overflow: 0,
  appointment_date: "2026-05-18",
  appointment_slot: "09:00",
  slot_date_label: "Today",
  slot_time_label: "09:00",
  fasting_required: false,
  prep_tags: [],
  instructions: "",
  appointment_status: "PENDING",
  workflow_hint: "Confirm appointment",
  allowed_actions: ["confirm", "mark_no_show", "reschedule"],
  patient_notes: null,
  status_updated_at: "2026-05-18T08:00:00.000Z",
  confirmed_at: null,
  checked_in_at: null,
  completed_at: null,
  no_show_at: null,
  cancelled_at: null,
};

function applyOptimisticPatch(
  row: ReturnType<typeof mapVisitAppointmentListItem>,
  res: VisitAppointmentWorkflowResponse,
  statusTab: "scheduled" | "confirmed" | "checked_in" | "completed" | "failed",
) {
  const patched = patchRowFromWorkflow(row, res);
  const hideFromTab = !appointmentMatchesTab(patched.status, statusTab);
  return { patched, hideFromTab };
}

describe("optimistic visit workflow UI updates", () => {
  it("keeps row on scheduled tab after reschedule (RESCHEDULED)", () => {
    const row = mapVisitAppointmentListItem(scheduledDto);
    const { patched, hideFromTab } = applyOptimisticPatch(row, {
      success: true,
      appointment_status: "RESCHEDULED",
      message: "Rescheduled.",
      appointment_id: row.id,
      allowed_actions: ["confirm", "mark_no_show"],
      workflow_hint: "Confirm rescheduled slot",
      status_updated_at: "2026-05-18T09:00:00.000Z",
    }, "scheduled");
    expect(patched.status).toBe("RESCHEDULED");
    expect(patched.allowedActions).toEqual(["confirm", "mark_no_show"]);
    expect(hideFromTab).toBe(false);
  });

  it("hides row from scheduled tab after confirm moves to CONFIRMED", () => {
    const row = mapVisitAppointmentListItem(scheduledDto);
    const { patched, hideFromTab } = applyOptimisticPatch(row, {
      success: true,
      appointment_status: "CONFIRMED",
      message: "Confirmed.",
      appointment_id: row.id,
      allowed_actions: ["check_in", "mark_no_show", "reschedule"],
      workflow_hint: "Patient appointment confirmed",
      status_updated_at: "2026-05-18T09:00:00.000Z",
      confirmed_at: "2026-05-18T09:00:00.000Z",
    }, "scheduled");
    expect(patched.status).toBe("CONFIRMED");
    expect(hideFromTab).toBe(true);
    expect(appointmentMatchesTab(patched.status, "confirmed")).toBe(true);
  });

  it("shows row on failed tab after mark no show from scheduled", () => {
    const row = mapVisitAppointmentListItem(scheduledDto);
    const { patched, hideFromTab } = applyOptimisticPatch(row, {
      success: true,
      appointment_status: "NO_SHOW",
      message: "Marked no show.",
      appointment_id: row.id,
      allowed_actions: [],
      workflow_hint: "Patient did not arrive",
      status_updated_at: "2026-05-18T10:00:00.000Z",
      no_show_at: "2026-05-18T10:00:00.000Z",
    }, "scheduled");
    expect(patched.allowedActions).toEqual([]);
    expect(hideFromTab).toBe(true);
    expect(appointmentMatchesTab(patched.status, "failed")).toBe(true);
  });

  it("updates allowed actions immediately after check-in without waiting for refetch", () => {
    const confirmed = mapVisitAppointmentListItem({
      ...scheduledDto,
      appointment_status: "CONFIRMED",
      allowed_actions: ["check_in", "mark_no_show", "reschedule"],
    });
    const { patched } = applyOptimisticPatch(confirmed, {
      success: true,
      appointment_status: "CHECKED_IN",
      message: "Checked in.",
      appointment_id: confirmed.id,
      allowed_actions: ["complete", "mark_no_show"],
      workflow_hint: "Patient checked in",
      status_updated_at: "2026-05-18T11:00:00.000Z",
      checked_in_at: "2026-05-18T11:00:00.000Z",
    }, "confirmed");
    expect(patched.allowedActions).toEqual(["complete", "mark_no_show"]);
    expect(patched.checkedInAt).toBe("2026-05-18T11:00:00.000Z");
  });
});
