"use client";

/**
 * Helpdesk appointments: live list (GET /api/appointments/ via BFF), tab filters,
 * create, cancel, check-in (POST /api/appointments/:id/check-in/ via BFF).
 * Implementation lives in HelpdeskAppointmentMockProvider; this file re-exports the hook.
 */
export {
  HelpdeskAppointmentMockProvider,
  useHelpdeskAppointmentsMock,
  useHelpdeskAppointmentsMock as useHelpdeskAppointments,
} from "@/components/helpdesk/HelpdeskAppointmentMockProvider";
