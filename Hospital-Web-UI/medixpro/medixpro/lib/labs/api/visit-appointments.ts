"use client";

import {
  mockCheckInVisitAppointment,
  mockCompleteVisitAppointment,
  mockConfirmVisitAppointment,
  mockFetchVisitAppointmentsList,
  mockFetchVisitAppointmentsSummary,
  mockMarkNoShowVisitAppointment,
} from "@/lib/labs/api/visit-appointments-mock";
import type {
  VisitAppointmentWorkflowResponse,
  VisitAppointmentsListResponse,
  VisitAppointmentsSummary,
} from "@/lib/labs/api/visit-appointments-types";

export type {
  VisitAppointmentListItem,
  VisitAppointmentWorkflowResponse,
  VisitAppointmentsListResponse,
  VisitAppointmentsSummary,
} from "@/lib/labs/api/visit-appointments-types";

export type VisitAppointmentsQueryInput = {
  q?: string;
  status?: string;
  date_preset?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export function buildVisitAppointmentsQueryParams(
  input: VisitAppointmentsQueryInput,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (input.q) params.q = input.q;
  if (input.status) params.status = input.status;
  if (input.date_preset) params.date_preset = input.date_preset;
  if (input.page) params.page = input.page;
  if (input.page_size) params.page_size = input.page_size;
  if (input.ordering) params.ordering = input.ordering;
  return params;
}

export async function fetchVisitAppointmentsList(
  input: VisitAppointmentsQueryInput,
  _options?: { signal?: AbortSignal },
): Promise<VisitAppointmentsListResponse> {
  return mockFetchVisitAppointmentsList(input);
}

export async function fetchVisitAppointmentsSummary(
  datePreset: string,
  _options?: { signal?: AbortSignal },
): Promise<VisitAppointmentsSummary> {
  return mockFetchVisitAppointmentsSummary(datePreset);
}

export async function confirmVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  return mockConfirmVisitAppointment(id);
}

export async function checkInVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  return mockCheckInVisitAppointment(id);
}

export async function completeVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  return mockCompleteVisitAppointment(id);
}

export async function markNoShowVisitAppointment(
  id: string,
  reason?: string,
): Promise<VisitAppointmentWorkflowResponse> {
  return mockMarkNoShowVisitAppointment(id, reason);
}
