import axiosClient from "@/lib/axiosClient";

export type DoctorAppointmentApiRow = {
  id: string;
  patient_name: string;
  patient_profile_id: string;
  clinic_name?: string;
  appointment_date: string;
  slot_start_time: string;
  slot_end_time?: string;
  consultation_mode?: string;
  appointment_type?: string;
  booking_source?: string;
  status: string;
  payment_mode?: string;
  payment_status?: string;
};

export type DoctorAppointmentsResponse = {
  total_appointments: number;
  total_pages: number;
  current_page: number;
  appointments: DoctorAppointmentApiRow[];
};

export type FetchDoctorAppointmentsTodayInput = {
  doctorId: string;
  clinicId: string;
  signal?: AbortSignal;
};

export type DoctorScheduleMetricsApi = {
  date: string;
  scheduled: number;
  waiting: number;
  completed: number;
  cancelled: number;
  no_show: number;
};

export type DoctorScheduleMetricsResponse = {
  status: string;
  message?: string;
  data: DoctorScheduleMetricsApi;
};

export async function fetchDoctorScheduleMetricsToday({
  doctorId,
  clinicId,
  signal,
}: FetchDoctorAppointmentsTodayInput): Promise<DoctorScheduleMetricsApi> {
  const response = await axiosClient.get<DoctorScheduleMetricsResponse>(
    "/appointments/metrics/today/",
    {
      params: { doctor_id: doctorId, clinic_id: clinicId },
      validateStatus: () => true,
      signal,
    }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; message?: string })?.error ??
      (response.data as { message?: string })?.message ??
      `Failed to load schedule metrics (${response.status})`;
    throw new Error(detail);
  }

  const data = (response.data as DoctorScheduleMetricsResponse)?.data;
  if (!data) {
    throw new Error("Invalid schedule metrics response");
  }

  return data;
}

export async function fetchDoctorAppointmentsToday({
  doctorId,
  clinicId,
  signal,
}: FetchDoctorAppointmentsTodayInput): Promise<DoctorAppointmentsResponse> {
  const response = await axiosClient.post<DoctorAppointmentsResponse>(
    "/appointments/doctor-appointments/",
    {
      doctor_id: doctorId,
      clinic_id: clinicId,
      date_filter: "today",
      sort_by: "slot_start_time",
      page: 1,
      page_size: 50,
    },
    { validateStatus: () => true, signal }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; detail?: string })?.error ??
      (response.data as { detail?: string })?.detail ??
      `Failed to load appointments (${response.status})`;
    throw new Error(detail);
  }

  return response.data;
}

export type DoctorQueueApiRow = {
  id: string;
  patient_name: string;
  patient_profile_id?: string | null;
  status: "waiting" | "vitals_done";
  position: number;
  token?: string | null;
};

export async function fetchDoctorQueueToday({
  doctorId,
  clinicId,
  signal,
}: FetchDoctorAppointmentsTodayInput): Promise<DoctorQueueApiRow[]> {
  const response = await axiosClient.get<DoctorQueueApiRow[]>(
    `/queue/doctor/${doctorId}/${clinicId}/`,
    { validateStatus: () => true, signal }
  );

  if (response.status >= 400) {
    const detail =
      (response.data as { error?: string; detail?: string })?.error ??
      (response.data as { detail?: string })?.detail ??
      `Failed to load queue (${response.status})`;
    throw new Error(detail);
  }

  return Array.isArray(response.data) ? response.data : [];
}
