export type VisitAppointmentsStatusTab =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "failed"
  | "";

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
  if (tab === "scheduled") return "PENDING";
  if (tab === "confirmed") return "CONFIRMED";
  if (tab === "checked_in") return "CHECKED_IN";
  if (tab === "completed") return "COMPLETED";
  if (tab === "failed") return "failed";
  return undefined;
}
