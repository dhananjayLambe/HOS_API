"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type {
  HomeCollectionWorkflowResponse,
  HomeCollectionsListResponse,
  HomeCollectionsSummary,
  PhlebotomistListItem,
} from "@/lib/labs/api/home-collections-types";

export type {
  HomeCollectionListItem,
  HomeCollectionWorkflowResponse,
  HomeCollectionsListResponse,
  HomeCollectionsSummary,
  PhlebotomistListItem,
} from "@/lib/labs/api/home-collections-types";

export type HomeCollectionsQueryInput = {
  q?: string;
  status?: string;
  date_preset?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export function buildHomeCollectionsQueryParams(input: HomeCollectionsQueryInput): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (input.q) params.q = input.q;
  if (input.status) params.status = input.status;
  if (input.date_preset) params.date_preset = input.date_preset;
  if (input.page) params.page = input.page;
  if (input.page_size) params.page_size = input.page_size;
  if (input.ordering) params.ordering = input.ordering;
  return params;
}

export async function fetchHomeCollectionsList(
  input: HomeCollectionsQueryInput,
  options?: { signal?: AbortSignal },
): Promise<HomeCollectionsListResponse> {
  const { data } = await backendAxiosClient.get<HomeCollectionsListResponse>("labs/home-collections/", {
    params: buildHomeCollectionsQueryParams(input),
    signal: options?.signal,
  });
  return data;
}

export async function fetchHomeCollectionsSummary(
  datePreset = "today",
  options?: { signal?: AbortSignal },
): Promise<HomeCollectionsSummary> {
  const { data } = await backendAxiosClient.get<HomeCollectionsSummary>("labs/home-collections/summary/", {
    params: { date_preset: datePreset },
    signal: options?.signal,
  });
  return data;
}

export async function fetchPhlebotomists(options?: { signal?: AbortSignal }): Promise<PhlebotomistListItem[]> {
  const { data } = await backendAxiosClient.get<PhlebotomistListItem[]>("labs/phlebotomists/", {
    signal: options?.signal,
  });
  return data;
}

export type AssignHomeCollectionPayload = {
  assignment_note?: string;
  phlebotomist_id?: string;
};

export async function assignHomeCollection(
  collectionId: string,
  payload?: AssignHomeCollectionPayload,
): Promise<HomeCollectionWorkflowResponse> {
  const body: AssignHomeCollectionPayload = {};
  if (payload?.assignment_note) {
    body.assignment_note = payload.assignment_note;
  }
  if (payload?.phlebotomist_id) {
    body.phlebotomist_id = payload.phlebotomist_id;
  }
  const { data } = await backendAxiosClient.post<HomeCollectionWorkflowResponse>(
    `labs/home-collections/${collectionId}/assign/`,
    body,
  );
  return data;
}

export async function startHomeCollection(collectionId: string): Promise<HomeCollectionWorkflowResponse> {
  const { data } = await backendAxiosClient.post<HomeCollectionWorkflowResponse>(
    `labs/home-collections/${collectionId}/start/`,
  );
  return data;
}

export async function collectHomeCollection(collectionId: string): Promise<HomeCollectionWorkflowResponse> {
  const { data } = await backendAxiosClient.post<HomeCollectionWorkflowResponse>(
    `labs/home-collections/${collectionId}/collect/`,
  );
  return data;
}

export async function failHomeCollection(
  collectionId: string,
  reason?: string,
): Promise<HomeCollectionWorkflowResponse> {
  const { data } = await backendAxiosClient.post<HomeCollectionWorkflowResponse>(
    `labs/home-collections/${collectionId}/fail/`,
    { reason: reason ?? "" },
  );
  return data;
}

export async function retryHomeCollection(collectionId: string): Promise<HomeCollectionWorkflowResponse> {
  const { data } = await backendAxiosClient.post<HomeCollectionWorkflowResponse>(
    `labs/home-collections/${collectionId}/retry/`,
  );
  return data;
}
