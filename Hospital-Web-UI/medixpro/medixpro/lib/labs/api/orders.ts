"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type { LabOrderWorkflowResponse, LabOrdersListResponse } from "@/lib/labs/api/orders-types";
import { buildLabOrdersQueryParams, type LabOrdersQueryInput } from "@/lib/labs/orders/build-lab-orders-query";

export type {
  LabOrderListItem,
  LabOrderWorkflowResponse,
  LabOrdersListResponse,
} from "@/lib/labs/api/orders-types";

export async function fetchLabOrdersList(
  input: LabOrdersQueryInput,
  options?: { signal?: AbortSignal },
): Promise<LabOrdersListResponse> {
  const { data } = await backendAxiosClient.get<LabOrdersListResponse>("labs/orders/", {
    params: buildLabOrdersQueryParams(input),
    signal: options?.signal,
  });
  return data;
}

export async function acceptLabOrder(assignmentId: string): Promise<LabOrderWorkflowResponse> {
  const { data } = await backendAxiosClient.post<LabOrderWorkflowResponse>(
    `labs/orders/${assignmentId}/accept/`,
  );
  return data;
}

export async function rejectLabOrder(
  assignmentId: string,
  reason: string,
): Promise<LabOrderWorkflowResponse> {
  const { data } = await backendAxiosClient.post<LabOrderWorkflowResponse>(
    `labs/orders/${assignmentId}/reject/`,
    { reason },
  );
  return data;
}
