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

export function mapDoctorAppointmentToRow(row: DoctorAppointmentApiRow): ScheduleAppointmentRow {
  const typeKey = (row.appointment_type ?? "new").toLowerCase();
  const statusKey = (row.status ?? "scheduled").toLowerCase();
  return {
    id: String(row.id),
    time: formatSlotTime(row.slot_start_time),
    patientName: (row.patient_name ?? "").trim() || "Patient",
    type: TYPE_LABEL[typeKey] ?? "New",
    status: STATUS_LABEL[statusKey] ?? "Scheduled",
  };
}

export function aggregateScheduleMetrics(rows: DoctorAppointmentApiRow[]): ScheduleMetrics {
  const counts = {
    scheduled: 0,
    completed: 0,
    waiting: 0,
    cancelled: 0,
    noShow: 0,
  };

  for (const row of rows) {
    switch ((row.status ?? "").toLowerCase()) {
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
      default:
        break;
    }
  }

  return counts;
}

export function countInConsultation(rows: DoctorAppointmentApiRow[]): number {
  return rows.filter((row) => (row.status ?? "").toLowerCase() === "in_consultation").length;
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
  totalAppointments: number
) {
  const metrics = aggregateScheduleMetrics(appointments);
  const appointmentRows = appointments.map(mapDoctorAppointmentToRow);
  const { snapshot, tokens } = mapDoctorQueueToPanel(queueRows, appointments);

  return {
    metrics,
    appointments: appointmentRows,
    queueSnapshot: snapshot,
    queueTokens: tokens,
    totalAppointments,
  };
}
