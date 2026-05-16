import type { CollectionType } from "@/lib/labs/constants/collection-type";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import type { Phase1OrderFilterStatus } from "@/lib/labs/constants/order-filters";
import {
  DEFAULT_LAB_ORDERS_DATE_PRESET,
  rangeForLabOrdersPreset,
  type LabOrdersDatePreset,
} from "@/lib/labs/orders/date-presets";

export type LabOrdersStatusFilter = "all" | Phase1OrderFilterStatus;
export type LabOrdersCollectionFilter = "all" | CollectionType;
export type LabOrdersUrgencyFilter = "all" | UrgencyLevel;

export interface LabOrdersFilterState {
  search: string;
  status: LabOrdersStatusFilter;
  collectionType: LabOrdersCollectionFilter;
  urgency: LabOrdersUrgencyFilter;
  datePreset: LabOrdersDatePreset;
}

export const DEFAULT_LAB_ORDERS_FILTERS: LabOrdersFilterState = {
  search: "",
  status: "all",
  collectionType: "all",
  urgency: "all",
  datePreset: DEFAULT_LAB_ORDERS_DATE_PRESET,
};

export interface LabOrdersQueryInput {
  filters: LabOrdersFilterState;
  page: number;
  pageSize: number;
  /** Debounced search sent to API as `q`. */
  q: string;
}

/** Stable serialization for list API — reuse across lab queue pages later. */
export function buildLabOrdersQueryParams(input: LabOrdersQueryInput): Record<string, string | number> {
  const { filters, page, pageSize, q } = input;
  const { date_from, date_to } = rangeForLabOrdersPreset(filters.datePreset);

  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
    date_from,
    date_to,
    ordering: "-created_at",
  };

  const trimmed = q.trim();
  if (trimmed) params.q = trimmed;
  if (filters.status !== "all") params.status = filters.status;
  if (filters.collectionType !== "all") params.collection_type = filters.collectionType;
  if (filters.urgency !== "all") params.urgency = filters.urgency;

  return params;
}
