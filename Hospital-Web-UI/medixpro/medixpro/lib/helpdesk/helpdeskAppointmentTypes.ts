/**
 * Central domain types for helpdesk appointments.
 * Keep stable for Phase B — wire APIs to these shapes without renaming components.
 */

export type ConsultationMode = "clinic" | "video";

export type AppointmentKind = "new" | "follow_up";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "checked_in"
  | "no_show"
  | "in_consultation";

export type AppointmentListTab = "today" | "upcoming" | "completed" | "cancelled";

export type SlotState = "available" | "booked" | "blocked";

/** One booked or bookable appointment row (mirrors future API). */
export interface Appointment {
  id: string;
  patientProfileId: string;
  /** Set when row comes from GET /api/appointments/ (queue check-in). */
  patientAccountId?: string;
  /** Appointment clinic (list/detail API). */
  clinicId?: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationMode: ConsultationMode;
  appointmentType: AppointmentKind;
  consultationFee: number;
  notes: string;
  status: AppointmentStatus;
}

/** A single time slot in the grid (mirrors future slots API). */
export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  state: SlotState;
}

export interface MockDoctor {
  id: string;
  name: string;
  specialization: string;
}

export interface AppointmentListFilters {
  doctorId: string;
  /** yyyy-MM-dd or "" for any */
  date: string;
  status: "all" | AppointmentStatus;
}

export interface CreateAppointmentInput {
  patientProfileId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationMode: ConsultationMode;
  appointmentType: AppointmentKind;
  consultationFee: number;
  notes: string;
  /** Required for POST /api/appointments/ (helpdesk create). */
  patientAccountId?: string;
  clinicId?: string;
  slotStartTime?: string;
  slotEndTime?: string;
}

export type UpdateAppointmentInput = CreateAppointmentInput & { id: string };

export interface FetchSlotsParams {
  doctorId: string;
  clinicId: string;
  /** yyyy-MM-dd */
  date: string;
}
