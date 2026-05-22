import type { CollectionType } from "@/lib/labs/constants/collection-type";
import {
  DEFAULT_REPORT_TASKS_FILTERS,
  type ReportTasksQueryFilters,
} from "@/lib/labs/reports/build-report-tasks-query";
import { parseReportTabFromSearchParams, type ReportTabKey } from "@/lib/labs/reports/report-operational-status";

export type ReportQueueUrlState = {
  tab: ReportTabKey;
  filters: ReportTasksQueryFilters;
  searchInput: string;
};

function parseBoolFlag(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseCollectionType(value: string | null): ReportTasksQueryFilters["collectionType"] {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "HOME" || v === "VISIT") return v;
  return "all";
}

export function parseReportQueueSearchParams(
  params: Pick<URLSearchParams, "get"> | null | undefined,
): ReportQueueUrlState {
  const tab = parseReportTabFromSearchParams(params?.get("tab"));
  const q = (params?.get("q") ?? "").trim();

  return {
    tab,
    searchInput: q,
    filters: {
      ...DEFAULT_REPORT_TASKS_FILTERS,
      collectionType: parseCollectionType(params?.get("collection") ?? params?.get("collection_type")),
      urgentOnly: parseBoolFlag(params?.get("urgent")),
      tatOnly: parseBoolFlag(params?.get("tat")),
    },
  };
}

export type ReportQueueUrlPatch = {
  tab?: ReportTabKey;
  searchInput?: string;
  filters?: ReportTasksQueryFilters;
};

/** Merge queue state into existing URL params (preserves unrelated keys e.g. demo). */
export function buildReportQueueSearchParams(
  existing: URLSearchParams,
  patch: ReportQueueUrlPatch,
): URLSearchParams {
  const params = new URLSearchParams(existing.toString());

  if (patch.tab !== undefined) {
    if (patch.tab === "all") params.delete("tab");
    else params.set("tab", patch.tab);
  }

  if (patch.searchInput !== undefined) {
    const q = patch.searchInput.trim();
    if (q) params.set("q", q);
    else params.delete("q");
  }

  if (patch.filters !== undefined) {
    const { filters } = patch;
    if (filters.urgentOnly) params.set("urgent", "1");
    else params.delete("urgent");
    if (filters.tatOnly) params.set("tat", "1");
    else params.delete("tat");
    if (filters.collectionType !== "all") params.set("collection", filters.collectionType);
    else params.delete("collection");
  }

  return params;
}

export function reportQueuePathFromParams(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `/lab-dashboard/reports?${qs}` : "/lab-dashboard/reports";
}
