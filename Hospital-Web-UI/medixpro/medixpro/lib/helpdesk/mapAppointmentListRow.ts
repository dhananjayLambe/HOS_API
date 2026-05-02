import type { Appointment, AppointmentKind, AppointmentStatus, ConsultationMode } from "./helpdeskAppointmentTypes";

/** Raw row from GET /api/appointments/ or detail `data` payload (aligned fields). */
export interface AppointmentListApiRow {
  id: string;
  patient_name?: string;
  patient_id?: string;
  patient_account_id?: string;
  doctor_id: string;
  doctor_name?: string;
  clinic_id?: string;
  appointment_date: string;
  slot_start_time: string;
  slot_end_time?: string;
  status: string;
  consultation_mode?: string;
  appointment_type?: string;
  consultation_fee?: string | number;
  notes?: string | null;
}

function normalizeStatus(raw: string): AppointmentStatus {
  switch (raw) {
    case "scheduled":
    case "completed":
    case "cancelled":
    case "checked_in":
    case "no_show":
    case "in_consultation":
      return raw;
    default:
      return "scheduled";
  }
}

function normalizeMode(raw: string | undefined): ConsultationMode {
  return raw === "video" ? "video" : "clinic";
}

function normalizeKind(raw: string | undefined): AppointmentKind {
  return raw === "follow_up" ? "follow_up" : "new";
}

export function mapAppointmentListApiRow(row: AppointmentListApiRow): Appointment {
  const timeRaw = row.slot_start_time ?? "00:00:00";
  const timeDisplay = timeRaw.length >= 5 ? timeRaw.slice(0, 5) : timeRaw;
  const feeRaw = row.consultation_fee;
  const feeNum =
    typeof feeRaw === "number" ? feeRaw : Number.parseFloat(String(feeRaw ?? "0"));
  return {
    id: String(row.id),
    patientProfileId: String(row.patient_id ?? ""),
    patientAccountId: row.patient_account_id != null ? String(row.patient_account_id) : undefined,
    clinicId: row.clinic_id != null ? String(row.clinic_id) : undefined,
    patientName: (row.patient_name ?? "").trim(),
    doctorId: String(row.doctor_id),
    doctorName: (row.doctor_name ?? "").trim() || "Doctor",
    appointmentDate: row.appointment_date,
    appointmentTime: timeDisplay,
    consultationMode: normalizeMode(row.consultation_mode),
    appointmentType: normalizeKind(row.appointment_type),
    consultationFee: Number.isFinite(feeNum) ? feeNum : 0,
    notes: typeof row.notes === "string" ? row.notes : "",
    status: normalizeStatus(row.status),
  };
}
