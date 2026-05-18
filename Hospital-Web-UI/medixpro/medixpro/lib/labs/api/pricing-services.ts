"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type {
  PackagePricingListItem,
  PricingCatalogListResponse,
  PricingCatalogSummary,
  ServicePricingListItem,
} from "@/lib/labs/api/pricing-services-types";

export type {
  IncludedTestItem,
  PackagePricingListItem,
  PricingCatalogSummary,
  PricingCatalogTab,
  ServicePricingListItem,
} from "@/lib/labs/api/pricing-services-types";

export type PricingCatalogQueryInput = {
  q?: string;
  status?: string;
  home_collection?: string;
  tat_min?: number;
  tat_max?: number;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export function buildPricingCatalogQueryParams(
  input: PricingCatalogQueryInput,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (input.q) params.q = input.q;
  if (input.status) params.status = input.status;
  if (input.home_collection) params.home_collection = input.home_collection;
  if (input.tat_min != null) params.tat_min = input.tat_min;
  if (input.tat_max != null) params.tat_max = input.tat_max;
  if (input.page) params.page = input.page;
  if (input.page_size) params.page_size = input.page_size;
  if (input.ordering) params.ordering = input.ordering;
  return params;
}

export async function fetchPricingServicesList(
  input: PricingCatalogQueryInput,
  options?: { signal?: AbortSignal },
): Promise<PricingCatalogListResponse<ServicePricingListItem>> {
  const { data } = await backendAxiosClient.get<PricingCatalogListResponse<ServicePricingListItem>>(
    "labs/pricing/services/",
    { params: buildPricingCatalogQueryParams(input), signal: options?.signal },
  );
  return data;
}

export async function fetchPricingPackagesList(
  input: PricingCatalogQueryInput,
  options?: { signal?: AbortSignal },
): Promise<PricingCatalogListResponse<PackagePricingListItem>> {
  const { data } = await backendAxiosClient.get<PricingCatalogListResponse<PackagePricingListItem>>(
    "labs/pricing/packages/",
    { params: buildPricingCatalogQueryParams(input), signal: options?.signal },
  );
  return data;
}

export async function fetchPricingCatalogSummary(
  options?: { signal?: AbortSignal },
): Promise<PricingCatalogSummary> {
  const { data } = await backendAxiosClient.get<PricingCatalogSummary>("labs/pricing/summary/", {
    signal: options?.signal,
  });
  return data;
}
