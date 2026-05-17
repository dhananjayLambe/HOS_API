import type { VisitAppointmentListItem } from "@/lib/labs/api/visit-appointments-types";
import type { AppointmentStatus } from "@/lib/labs/constants/status";
import { enrichAppointmentRow } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";

export function mapVisitAppointmentListItem(dto: VisitAppointmentListItem): LabAppointmentRow {
  const base: LabAppointmentRow = {
    id: dto.id,
    appointmentId: dto.appointment_id,
    orderNumber: dto.order_number,
    orderUuid: dto.order_uuid,
    patientName: dto.patient_name,
    patientPhone: dto.patient_phone,
    patientAge: dto.patient_age,
    patientGender: dto.patient_gender,
    testCount: dto.test_count,
    testNames: dto.test_names,
    testNamesOverflow: dto.test_names_overflow,
    appointmentDate: dto.appointment_date,
    appointmentSlot: dto.appointment_slot,
    slotDateLabel: dto.slot_date_label,
    slotTimeLabel: dto.slot_time_label,
    fastingRequired: dto.fasting_required,
    prepTags: dto.prep_tags,
    instructions: dto.instructions,
    status: dto.appointment_status,
    workflowHint: dto.workflow_hint,
    allowedActions: dto.allowed_actions,
    isOverdue: false,
    patientNotes: dto.patient_notes,
    statusUpdatedAt: dto.status_updated_at,
    checkedInAt: dto.checked_in_at,
    completedAt: dto.completed_at,
    cancelledAt: dto.cancelled_at,
  };
  return enrichAppointmentRow(base);
}

export function patchRowFromWorkflow(
  row: LabAppointmentRow,
  res: {
    appointment_status: AppointmentStatus;
    allowed_actions: LabAppointmentRow["allowedActions"];
    workflow_hint: string;
    status_updated_at: string;
    checked_in_at?: string | null;
    completed_at?: string | null;
    cancelled_at?: string | null;
  },
): LabAppointmentRow {
  const patched: LabAppointmentRow = {
    ...row,
    status: res.appointment_status,
    allowedActions: res.allowed_actions,
    workflowHint: res.workflow_hint,
    statusUpdatedAt: res.status_updated_at,
    checkedInAt: res.checked_in_at !== undefined ? res.checked_in_at : row.checkedInAt,
    completedAt: res.completed_at !== undefined ? res.completed_at : row.completedAt,
    cancelledAt: res.cancelled_at !== undefined ? res.cancelled_at : row.cancelledAt,
  };
  return enrichAppointmentRow(patched);
}
