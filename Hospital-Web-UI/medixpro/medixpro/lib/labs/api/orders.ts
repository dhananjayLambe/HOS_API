"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type { LabOrdersListResponse } from "@/lib/labs/api/orders-types";
import { buildLabOrdersQueryParams, type LabOrdersQueryInput } from "@/lib/labs/orders/build-lab-orders-query";

export type { LabOrderListItem, LabOrdersListResponse } from "@/lib/labs/api/orders-types";

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
