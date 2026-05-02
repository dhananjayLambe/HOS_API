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
