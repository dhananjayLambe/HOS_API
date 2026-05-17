import type { VisitAppointmentActionKey } from "@/lib/labs/api/visit-appointments-types";
import type { AppointmentStatus } from "@/lib/labs/constants/status";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labs/constants/status";
import type { LabAppointmentRow } from "@/lib/labs/types";

const TERMINAL_STATUSES: AppointmentStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

const ACTIONS_BY_STATUS: Record<AppointmentStatus, VisitAppointmentActionKey[]> = {
  PENDING: ["confirm", "mark_no_show"],
  CONFIRMED: ["check_in", "mark_no_show"],
  CHECKED_IN: ["complete", "mark_no_show"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
  RESCHEDULED: ["confirm", "mark_no_show"],
};

const BASE_HINTS: Record<AppointmentStatus, string> = {
  PENDING: "Confirm appointment",
  CONFIRMED: "Check patient in at facility",
  CHECKED_IN: "Complete visit when tests are done",
  COMPLETED: "Visit completed",
  NO_SHOW: "Patient did not attend",
  CANCELLED: "Appointment cancelled",
  RESCHEDULED: "Confirm rescheduled slot",
};

export function appointmentStatusDisplayLabel(status: AppointmentStatus): string {
  if (status === "PENDING") return "Scheduled";
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

export function resolveAllowedActions(status: AppointmentStatus): VisitAppointmentActionKey[] {
  return ACTIONS_BY_STATUS[status] ?? [];
}

export function isAppointmentOverdue(
  appointmentDate: string,
  status: AppointmentStatus,
  referenceDate: Date = new Date(),
): boolean {
  if (TERMINAL_STATUSES.includes(status)) return false;
  const appt = parseLocalDate(appointmentDate);
  if (!appt) return false;
  const today = startOfLocalDay(referenceDate);
  return appt < today;
}

function parseLocalDate(isoDate: string): Date | null {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function workflowHintForStatus(
  status: AppointmentStatus,
  opts?: { overdue?: boolean },
): string {
  const base = BASE_HINTS[status] ?? "Review appointment";
  if (opts?.overdue) {
    return `Overdue — ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }
  return base;
}

export function enrichAppointmentRow(row: LabAppointmentRow): LabAppointmentRow {
  const overdue = isAppointmentOverdue(row.appointmentDate, row.status);
  const allowedActions = resolveAllowedActions(row.status);
  const workflowHint = workflowHintForStatus(row.status, { overdue });
  return {
    ...row,
    isOverdue: overdue,
    allowedActions,
    workflowHint,
  };
}

export function nextStatusForAction(
  action: VisitAppointmentActionKey,
  current: AppointmentStatus,
): AppointmentStatus | null {
  if (action === "confirm" && (current === "PENDING" || current === "RESCHEDULED")) return "CONFIRMED";
  if (action === "check_in" && current === "CONFIRMED") return "CHECKED_IN";
  if (action === "complete" && current === "CHECKED_IN") return "COMPLETED";
  if (action === "mark_no_show" && !TERMINAL_STATUSES.includes(current)) return "NO_SHOW";
  return null;
}

export const VISIT_ACTION_LABELS: Record<VisitAppointmentActionKey, string> = {
  confirm: "Confirm",
  check_in: "Check in",
  complete: "Complete",
  mark_no_show: "Mark no show",
};
