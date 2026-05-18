"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type {
  RescheduleVisitAppointmentPayload,
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

export const VISIT_APPOINTMENTS_BASE = "labs/visit-appointments";

export function parseVisitWorkflowActionError(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string } }; message?: string };
  return ax?.response?.data?.detail || ax?.message || "Action failed.";
}

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
  options?: { signal?: AbortSignal },
): Promise<VisitAppointmentsListResponse> {
  const { data } = await backendAxiosClient.get<VisitAppointmentsListResponse>(
    `${VISIT_APPOINTMENTS_BASE}/`,
    {
      params: buildVisitAppointmentsQueryParams(input),
      signal: options?.signal,
    },
  );
  return data;
}

export async function fetchVisitAppointmentsSummary(
  datePreset: string,
  options?: { signal?: AbortSignal },
): Promise<VisitAppointmentsSummary> {
  const { data } = await backendAxiosClient.get<VisitAppointmentsSummary>(
    `${VISIT_APPOINTMENTS_BASE}/summary/`,
    {
      params: { date_preset: datePreset || "today" },
      signal: options?.signal,
    },
  );
  return data;
}

function normalizeWorkflowResponse(
  data: VisitAppointmentWorkflowResponse,
): VisitAppointmentWorkflowResponse {
  return {
    ...data,
    status_updated_at:
      data.status_updated_at ??
      data.checked_in_at ??
      data.completed_at ??
      data.confirmed_at ??
      new Date().toISOString(),
  };
}

function visitWorkflowUrl(visitId: string, action: string): string {
  return `${VISIT_APPOINTMENTS_BASE}/${visitId}/${action}/`;
}

export async function confirmVisitAppointment(
  id: string,
): Promise<VisitAppointmentWorkflowResponse> {
  const { data } = await backendAxiosClient.post<VisitAppointmentWorkflowResponse>(
    visitWorkflowUrl(id, "confirm"),
  );
  return normalizeWorkflowResponse(data);
}

export async function checkInVisitAppointment(
  id: string,
): Promise<VisitAppointmentWorkflowResponse> {
  const { data } = await backendAxiosClient.post<VisitAppointmentWorkflowResponse>(
    visitWorkflowUrl(id, "check-in"),
  );
  return normalizeWorkflowResponse(data);
}

export async function completeVisitAppointment(
  id: string,
): Promise<VisitAppointmentWorkflowResponse> {
  const { data } = await backendAxiosClient.post<VisitAppointmentWorkflowResponse>(
    visitWorkflowUrl(id, "complete"),
  );
  return normalizeWorkflowResponse(data);
}

export async function markNoShowVisitAppointment(
  id: string,
  reason?: string,
): Promise<VisitAppointmentWorkflowResponse> {
  const { data } = await backendAxiosClient.post<VisitAppointmentWorkflowResponse>(
    visitWorkflowUrl(id, "no-show"),
    { reason: reason ?? "" },
  );
  return normalizeWorkflowResponse(data);
}

export async function rescheduleVisitAppointment(
  id: string,
  payload?: RescheduleVisitAppointmentPayload,
): Promise<VisitAppointmentWorkflowResponse> {
  const body: RescheduleVisitAppointmentPayload = {};
  if (payload?.appointment_date) body.appointment_date = payload.appointment_date;
  if (payload?.appointment_slot?.trim()) body.appointment_slot = payload.appointment_slot.trim();
  const { data } = await backendAxiosClient.post<VisitAppointmentWorkflowResponse>(
    visitWorkflowUrl(id, "reschedule"),
    body,
  );
  return normalizeWorkflowResponse(data);
}
