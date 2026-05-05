import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";

/** Extract cursor token from DRF `next` link (absolute or relative). */
export function parseCursorFromNext(next: string | null | undefined): string | undefined {
  if (!next?.trim()) return undefined;
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const u = new URL(next, base);
    return u.searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * On poll: replace the first page of results with fresh server order, keep older pages (tail).
 */
export function mergeFirstAppointmentPage(prev: Appointment[], firstPage: Appointment[]): Appointment[] {
  const incoming = new Set(firstPage.map((x) => x.id));
  const tail = prev.filter((x) => !incoming.has(x.id));
  return [...firstPage, ...tail];
}
