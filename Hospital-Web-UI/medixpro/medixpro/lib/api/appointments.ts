import axiosClient from "@/lib/axiosClient";

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

/** 201 response from Django appointment create. */
export interface AppointmentCreatedResponse {
  id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  slot_start_time: string;
  status: string;
}

export async function createAppointment(payload: AppointmentCreatePayload) {
  /** Same-origin `/api` base + `appointments` → `/api/appointments` (Next BFF). */
  return axiosClient.post<AppointmentCreatedResponse>("/appointments/", payload);
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
