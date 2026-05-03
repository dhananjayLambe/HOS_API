import axiosClient from "@/lib/axiosClient";
import type { AppointmentListApiRow } from "@/lib/helpdesk/mapAppointmentListRow";

/** POST /api/appointments/ (Django) — snake_case body. */
export interface AppointmentCreatePayload {
  patient_account_id: string;
  patient_profile_id: string;
  doctor_id: string;
  clinic_id: string;
  appointment_date: string;
  slot_start_time: string;
  slot_end_time: string;
  consultation_mode: "clinic" | "video";
  appointment_type: "new" | "follow_up";
  consultation_fee: string | number;
  notes?: string;
}

/** 201 create / 200 reschedule from Django. */
export interface AppointmentCreatedResponse {
  id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  slot_start_time: string;
  status: string;
  consultation_mode: string;
  appointment_type: string;
  consultation_fee: string;
  notes: string;
}

export async function createAppointment(payload: AppointmentCreatePayload) {
  /** Same-origin `/api` base + `appointments` → `/api/appointments` (Next BFF). */
  return axiosClient.post<AppointmentCreatedResponse>("/appointments/", payload);
}

export type GetAppointmentsParams = {
  tab: string;
  doctor_id?: string;
  clinic_id?: string;
  date?: string;
};

/**
 * GET /api/appointments/ (Next BFF → Django). Returns raw list JSON; use validateStatus to read 4xx bodies.
 */
export async function getAppointments(
  params: GetAppointmentsParams,
  options?: { signal?: AbortSignal }
) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
  ) as Record<string, string>;
  return axiosClient.get<AppointmentListApiRow[]>("/appointments/", {
    params: query,
    validateStatus: () => true,
    ...options,
  });
}

export interface AppointmentDetailEnvelope {
  status?: string;
  message?: string;
  data?: AppointmentListApiRow;
}

export async function fetchAppointmentDetail(
  appointmentId: string,
  options?: { signal?: AbortSignal }
) {
  return axiosClient.post<AppointmentDetailEnvelope>(
    "/appointments/detail/",
    { id: appointmentId },
    { validateStatus: () => true, ...options }
  );
}

/** POST /api/appointments/<id>/check-in/ (Next BFF → Django). */
export interface AppointmentCheckInResponse {
  id: string;
  status: string;
  encounter_id: string;
  check_in_time: string | null;
  message: string;
}

/**
 * Low-level check-in POST. Use {@link HelpdeskAppointmentMockProvider}'s `checkInAppointment` for refetch + mutation state.
 * Path is relative to axios base (`/api` + `/appointments/...`).
 */
export async function postAppointmentCheckIn(
  appointmentId: string,
  options?: { signal?: AbortSignal }
) {
  return axiosClient.post<AppointmentCheckInResponse>(
    `/appointments/${appointmentId}/check-in/`,
    {},
    {
      validateStatus: () => true,
      ...options,
    }
  );
}

/** PATCH /api/appointments/<id>/cancel/ (Next BFF → Django). */
export async function cancelAppointmentRequest(
  appointmentId: string,
  options?: { signal?: AbortSignal; cancel_reason?: string }
) {
  const { signal, cancel_reason, ...axiosRest } = options ?? {};
  const body = cancel_reason != null && cancel_reason !== "" ? { cancel_reason } : {};
  return axiosClient.patch<unknown>(`/appointments/${appointmentId}/cancel/`, body, {
    validateStatus: () => true,
    signal,
    ...axiosRest,
  });
}

/** PATCH /api/appointments/<id>/reschedule/ (Next BFF → Django). */
export interface AppointmentReschedulePayload {
  doctor_id: string;
  clinic_id: string;
  appointment_date: string;
  slot_start_time: string;
  slot_end_time: string;
  consultation_mode: "clinic" | "video";
  appointment_type: "new" | "follow_up";
  consultation_fee: string | number;
  notes?: string;
}

export async function patchRescheduleAppointment(
  appointmentId: string,
  payload: AppointmentReschedulePayload,
  options?: { signal?: AbortSignal }
) {
  return axiosClient.patch<AppointmentCreatedResponse>(
    `/appointments/${appointmentId}/reschedule/`,
    payload,
    { ...options }
  );
}

/** Django GET /api/appointments/slots/ — one row in `data.slots`. */
export interface AppointmentSlotApiRow {
  start_time: string;
  end_time: string;
  status: "available" | "booked" | "blocked";
}

export interface AppointmentSlotsData {
  date: string;
  doctor_id: string;
  clinic_id: string;
  slots: AppointmentSlotApiRow[];
  summary: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  meta?: {
    day_name?: string;
    is_on_leave?: boolean;
    slot_duration?: number;
    buffer_time?: number;
    /** True when API created/filled default weekly hours for this doctor+clinic. */
    availability_bootstrapped?: boolean;
  };
}

/** Django wrapper for slots GET. */
export interface AppointmentSlotsEnvelope {
  status: string;
  message: string;
  data: AppointmentSlotsData | null;
}

export async function getAppointmentSlots(
  params: {
    doctor_id: string;
    clinic_id: string;
    date: string;
  },
  options?: { signal?: AbortSignal }
) {
  /** Resolve for 4xx so we can read Django/DRF JSON body (message) instead of throwing before parse. */
  return axiosClient.get<AppointmentSlotsEnvelope>("/appointments/slots/", {
    params,
    ...options,
    validateStatus: () => true,
  });
}
