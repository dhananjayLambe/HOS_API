import {
  rangeForLabOrdersPreset,
  type LabOrdersDatePreset,
} from "@/lib/labs/orders/date-presets";
import type { LabOrdersFilterState } from "@/lib/labs/orders/build-lab-orders-query";
import type { ReportTasksListQueryParams } from "@/lib/labs/reports/api/report-api-types";

/** Single operational window per poll — no client cursor chaining in Phase 6. */
export const REPORT_QUEUE_PAGE_SIZE = 50;

/** Filters used for report queue list + React Query key serialization. */
export type ReportTasksQueryFilters = LabOrdersFilterState & {
  urgentOnly?: boolean;
  tatOnly?: boolean;
};

/** Post-accept/collected assignments stay ACCEPTED — do not default to IN_PROGRESS. */
export const DEFAULT_REPORT_TASKS_FILTERS: ReportTasksQueryFilters = {
  search: "",
  status: "all",
  collectionType: "all",
  urgency: "all",
  datePreset: "month",
  urgentOnly: false,
  tatOnly: false,
};

export function buildReportTasksQueryParams(
  filters: ReportTasksQueryFilters,
  options?: { pageSize?: number; q?: string; cursor?: string | null },
): ReportTasksListQueryParams {
  const { date_from, date_to } = rangeForLabOrdersPreset(filters.datePreset as LabOrdersDatePreset);
  const params: ReportTasksListQueryParams = {
    page_size: options?.pageSize ?? REPORT_QUEUE_PAGE_SIZE,
    date_from,
    date_to,
    ordering: "-assigned_at",
  };

  const q = (options?.q ?? filters.search).trim();
  if (q) params.q = q;
  if (filters.status !== "all") params.status = filters.status;
  if (filters.collectionType !== "all") params.collection_type = filters.collectionType;
  if (filters.urgency !== "all") params.urgency = filters.urgency;
  if (options?.cursor) params.cursor = options.cursor;

  return params;
}
