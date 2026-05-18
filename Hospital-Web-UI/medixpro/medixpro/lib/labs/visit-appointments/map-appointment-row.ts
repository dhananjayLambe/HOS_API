import type {
  VisitAppointmentListItem,
  VisitAppointmentWorkflowResponse,
} from "@/lib/labs/api/visit-appointments-types";
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
    prepSummary: dto.prep_summary,
    instructions: dto.instructions,
    status: dto.appointment_status,
    workflowHint: dto.workflow_hint,
    allowedActions: dto.allowed_actions,
    isOverdue: false,
    patientNotes: dto.patient_notes,
    statusUpdatedAt: dto.status_updated_at,
    confirmedAt: dto.confirmed_at ?? null,
    checkedInAt: dto.checked_in_at,
    completedAt: dto.completed_at,
    noShowAt: dto.no_show_at ?? null,
    cancelledAt: dto.cancelled_at,
    timelineEvents: dto.timeline_events,
  };
  return enrichAppointmentRow(base, { preserveWorkflowFromApi: true });
}

function patchOptionalTimestamp(
  next: string | null | undefined,
  previous: string | null,
): string | null {
  return next !== undefined ? next : previous;
}

export function patchRowFromWorkflow(
  row: LabAppointmentRow,
  res: VisitAppointmentWorkflowResponse,
): LabAppointmentRow {
  const patched: LabAppointmentRow = {
    ...row,
    status: res.appointment_status,
    allowedActions: res.allowed_actions,
    workflowHint: res.workflow_hint,
    statusUpdatedAt: res.status_updated_at ?? row.statusUpdatedAt,
    confirmedAt: patchOptionalTimestamp(res.confirmed_at, row.confirmedAt),
    checkedInAt: patchOptionalTimestamp(res.checked_in_at, row.checkedInAt),
    completedAt: patchOptionalTimestamp(res.completed_at, row.completedAt),
    noShowAt: patchOptionalTimestamp(res.no_show_at, row.noShowAt),
    cancelledAt: patchOptionalTimestamp(res.cancelled_at, row.cancelledAt),
  };
  return enrichAppointmentRow(patched, { preserveWorkflowFromApi: true });
}
