import type { AppointmentStatus } from "@/lib/labs/constants/status";

export type VisitAppointmentActionKey =
  | "confirm"
  | "check_in"
  | "complete"
  | "mark_no_show"
  | "reschedule";

export type VisitTimelineEventItem = {
  event: string;
  raw_event: string;
  timestamp: string;
  label: string;
  detail?: string;
  event_order: number;
};

export type VisitAppointmentListItem = {
  id: string;
  appointment_id: string;
  order_number: string;
  order_uuid: string;
  patient_name: string;
  patient_phone: string;
  patient_age: number | null;
  patient_gender: string;
  test_count: number;
  test_names: string[];
  test_names_overflow: number;
  appointment_date: string;
  appointment_slot: string;
  slot_date_label: string;
  slot_time_label: string;
  fasting_required: boolean;
  prep_tags: string[];
  prep_summary?: string;
  instructions: string;
  appointment_status: AppointmentStatus;
  workflow_hint: string;
  allowed_actions: VisitAppointmentActionKey[];
  patient_notes: string | null;
  status_updated_at: string;
  confirmed_at?: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  no_show_at?: string | null;
  cancelled_at: string | null;
  timeline_events?: VisitTimelineEventItem[];
};

export type VisitAppointmentsListResponse = {
  results: VisitAppointmentListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type VisitAppointmentsSummary = {
  scheduled_today: number;
  confirmed_today: number;
  checked_in: number;
  completed_today: number;
  failed_no_show: number;
};

export type VisitAppointmentWorkflowResponse = {
  success: boolean;
  appointment_status: AppointmentStatus;
  message: string;
  appointment_id: string;
  allowed_actions: VisitAppointmentActionKey[];
  workflow_hint: string;
  status_updated_at?: string | null;
  confirmed_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
  cancelled_at?: string | null;
};

export type RescheduleVisitAppointmentPayload = {
  appointment_date?: string;
  appointment_slot?: string;
};
