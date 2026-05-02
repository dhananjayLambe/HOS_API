"use client";

/**
 * Helpdesk appointments: live list (GET /api/appointments/ via BFF), tab filters,
 * create, cancel, queue check-in. Components use useHelpdeskAppointmentsMock or
 * the useHelpdeskAppointments alias.
 */
export {
  HelpdeskAppointmentMockProvider,
  useHelpdeskAppointmentsMock,
  useHelpdeskAppointmentsMock as useHelpdeskAppointments,
} from "@/components/helpdesk/HelpdeskAppointmentMockProvider";
