import { format, parse } from "date-fns";

import type { ScheduleAppointmentRow } from "@/components/doctor/doctor-schedule-appointments-list";
import type { ScheduleMetrics } from "@/components/doctor/doctor-schedule-metrics-strip";
import type {
  ScheduleQueueSnapshot,
  ScheduleQueueTokenRow,
} from "@/components/doctor/doctor-schedule-queue-panel";
import type { DoctorAppointmentApiRow, DoctorQueueApiRow } from "@/lib/api/doctor-appointments";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  checked_in: "Waiting",
  in_consultation: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const TYPE_LABEL: Record<string, string> = {
  new: "New",
  follow_up: "Follow-up",
};

function normalizeStatus(raw: string | undefined): string {
  return (raw ?? "scheduled").toLowerCase().trim();
}

function resolveAppointmentTypeLabel(row: DoctorAppointmentApiRow): string {
  if ((row.booking_source ?? "").toLowerCase() === "walk_in") {
    return "Walk-in";
  }
  const typeKey = (row.appointment_type ?? "new").toLowerCase();
  return TYPE_LABEL[typeKey] ?? "New";
}

function formatSlotTime(slotStartTime: string): string {
  const raw = slotStartTime?.trim() ?? "";
  if (!raw) return "—";
  const normalized = raw.length >= 8 ? raw.slice(0, 8) : raw.length === 5 ? `${raw}:00` : raw;
  try {
    const parsed = parse(normalized, "HH:mm:ss", new Date());
    return format(parsed, "hh:mm a");
  } catch {
    return raw.length >= 5 ? raw.slice(0, 5) : raw;
  }
}

function queueStatusToAppointmentStatus(status: DoctorQueueApiRow["status"]): string {
  return status === "vitals_done" ? "checked_in" : "checked_in";
}

/**
 * Helpdesk walk-in check-in can add patients to queue without an Appointment row.
 * Synthesize appointment-shaped rows so Schedule Summary and Today's list stay aligned.
 */
export function mergeQueueWalkInsIntoAppointments(
  appointments: DoctorAppointmentApiRow[],
  queueRows: DoctorQueueApiRow[]
): DoctorAppointmentApiRow[] {
  const linkedProfileIds = new Set(
    appointments
      .map((row) => row.patient_profile_id)
      .filter((id): id is string => Boolean(id))
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const synthetic: DoctorAppointmentApiRow[] = [];

  for (const queueRow of queueRows) {
    const profileId = queueRow.patient_profile_id;
    if (profileId && linkedProfileIds.has(profileId)) continue;

    synthetic.push({
      id: `queue-${queueRow.id}`,
      patient_name: queueRow.patient_name,
      patient_profile_id: profileId ?? queueRow.id,
      appointment_date: today,
      slot_start_time: "00:00:00",
      status: queueStatusToAppointmentStatus(queueRow.status),
      appointment_type: "new",
      booking_source: "walk_in",
    });

    if (profileId) linkedProfileIds.add(profileId);
  }

  return [...appointments, ...synthetic];
}

export function mapDoctorAppointmentToRow(row: DoctorAppointmentApiRow): ScheduleAppointmentRow {
  const statusKey = normalizeStatus(row.status);
  return {
    id: String(row.id),
    time: formatSlotTime(row.slot_start_time),
    patientName: (row.patient_name ?? "").trim() || "Patient",
    type: resolveAppointmentTypeLabel(row),
    status: STATUS_LABEL[statusKey] ?? "Scheduled",
  };
}

export function aggregateScheduleMetrics(
  rows: DoctorAppointmentApiRow[],
  queueRows: DoctorQueueApiRow[] = []
): ScheduleMetrics {
  const counts = {
    scheduled: 0,
    completed: 0,
    waiting: 0,
    cancelled: 0,
    noShow: 0,
  };

  const countedProfileIds = new Set<string>();

  for (const row of rows) {
    const status = normalizeStatus(row.status);
    if (row.patient_profile_id) countedProfileIds.add(row.patient_profile_id);

    switch (status) {
      case "scheduled":
        counts.scheduled += 1;
        break;
      case "completed":
        counts.completed += 1;
        break;
      case "checked_in":
        counts.waiting += 1;
        break;
      case "cancelled":
        counts.cancelled += 1;
        break;
      case "no_show":
        counts.noShow += 1;
        break;
      case "in_consultation":
        // Active consultations are tracked in Live Queue KPI; not a summary chip.
        break;
      default:
        break;
    }
  }

  // Queue-only walk-ins (no appointment row) still count toward Waiting.
  for (const queueRow of queueRows) {
    if (queueRow.status !== "waiting") continue;
    const profileId = queueRow.patient_profile_id;
    if (profileId && countedProfileIds.has(profileId)) continue;
    counts.waiting += 1;
    if (profileId) countedProfileIds.add(profileId);
  }

  return counts;
}

export function countInConsultation(rows: DoctorAppointmentApiRow[]): number {
  return rows.filter((row) => normalizeStatus(row.status) === "in_consultation").length;
}

export function mapDoctorQueueToPanel(
  queueRows: DoctorQueueApiRow[],
  appointmentRows: DoctorAppointmentApiRow[]
): { snapshot: ScheduleQueueSnapshot; tokens: ScheduleQueueTokenRow[] } {
  const waiting = queueRows.filter((row) => row.status === "waiting").length;
  const vitalsDone = queueRows.filter((row) => row.status === "vitals_done").length;
  const inConsultation = countInConsultation(appointmentRows);

  const tokens: ScheduleQueueTokenRow[] = [...queueRows]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: String(row.id),
      token: row.token ?? "",
      patientName: (row.patient_name ?? "").trim() || "Patient",
      status: row.status,
    }));

  return {
    snapshot: { waiting, vitalsDone, inConsultation },
    tokens,
  };
}

export function mapDoctorAppointmentsResponse(
  appointments: DoctorAppointmentApiRow[],
  queueRows: DoctorQueueApiRow[],
  totalAppointmentsFromApi: number
) {
  const mergedAppointments = mergeQueueWalkInsIntoAppointments(appointments, queueRows);
  const metrics = aggregateScheduleMetrics(mergedAppointments, queueRows);
  const appointmentRows = mergedAppointments.map(mapDoctorAppointmentToRow);
  const { snapshot, tokens } = mapDoctorQueueToPanel(queueRows, mergedAppointments);
  const queueOnlyCount = mergedAppointments.length - appointments.length;
  const totalAppointments = totalAppointmentsFromApi + queueOnlyCount;

  return {
    metrics,
    appointments: appointmentRows,
    queueSnapshot: snapshot,
    queueTokens: tokens,
    totalAppointments,
  };
}
