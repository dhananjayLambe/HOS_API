import type { AppointmentStatus } from "@/lib/labs/constants/status";

export type VisitAppointmentsStatusTab =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "failed"
  | "";

/** Mirrors backend labs visit_appointments_list_service._STATUS_TAB_MAP */
export const APPOINTMENT_STATUSES_BY_TAB: Record<
  Exclude<VisitAppointmentsStatusTab, "">,
  readonly AppointmentStatus[]
> = {
  scheduled: ["PENDING", "RESCHEDULED"],
  confirmed: ["CONFIRMED"],
  checked_in: ["CHECKED_IN"],
  completed: ["COMPLETED"],
  failed: ["NO_SHOW", "CANCELLED"],
};

export type VisitAppointmentsDatePreset = "today" | "tomorrow" | "week" | "";

export type VisitAppointmentsFilterState = {
  statusTab: VisitAppointmentsStatusTab;
  datePreset: VisitAppointmentsDatePreset;
  search: string;
};

export const DEFAULT_VISIT_APPOINTMENTS_FILTERS: VisitAppointmentsFilterState = {
  statusTab: "scheduled",
  datePreset: "today",
  search: "",
};

export const VISIT_APPOINTMENTS_TAB_OPTIONS: { id: VisitAppointmentsStatusTab; label: string }[] = [
  { id: "scheduled", label: "Scheduled" },
  { id: "confirmed", label: "Confirmed" },
  { id: "checked_in", label: "Checked in" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
];

export const VISIT_APPOINTMENTS_DATE_OPTIONS: { id: VisitAppointmentsDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
];

/** Maps UI tab to API/list filter status param. */
export function statusParamForTab(tab: VisitAppointmentsStatusTab): string | undefined {
  if (!tab) return undefined;
  /** Virtual filter: PENDING + RESCHEDULED (awaiting (re)confirmation). */
  if (tab === "scheduled") return "scheduled";
  if (tab === "confirmed") return "CONFIRMED";
  if (tab === "checked_in") return "CHECKED_IN";
  if (tab === "completed") return "COMPLETED";
  if (tab === "failed") return "failed";
  return undefined;
}

/** Client-side tab membership (same semantics as list API filters). */
export function appointmentMatchesTab(
  status: AppointmentStatus,
  tab: VisitAppointmentsStatusTab,
): boolean {
  if (!tab) return true;
  const allowed = APPOINTMENT_STATUSES_BY_TAB[tab];
  return allowed ? allowed.includes(status) : false;
}
