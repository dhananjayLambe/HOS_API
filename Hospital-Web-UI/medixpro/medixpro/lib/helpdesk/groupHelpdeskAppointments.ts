import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";

/** Group primary-section rows for operational UI (uses backend time_bucket + status). */
export function groupPrimaryAppointments(apps: Appointment[]): {
  waiting: Appointment[];
  next: Appointment[];
  later: Appointment[];
  other: Appointment[];
} {
  const waiting = apps.filter(
    (a) => a.status === "checked_in" || a.status === "in_consultation"
  );
  const w = new Set(waiting.map((x) => x.id));
  const next = apps.filter(
    (a) =>
      !w.has(a.id) && (a.timeBucket === "overdue" || a.timeBucket === "next_1h")
  );
  const n = new Set(next.map((x) => x.id));
  const later = apps.filter(
    (a) => !w.has(a.id) && !n.has(a.id) && a.timeBucket === "later_today"
  );
  const lt = new Set(later.map((x) => x.id));
  const other = apps.filter((a) => !w.has(a.id) && !n.has(a.id) && !lt.has(a.id));
  return { waiting, next, later, other };
}
