import {
  DEFAULT_REPORTS_QUEUE_FILTERS,
  type ReportsDatePreset,
  type ReportsQueueFilterState,
  type ReportsWorkflowFilter,
} from "@/lib/labs/reports/completion/reports-queue-filters";
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

const WORKFLOW_URL_VALUES = new Set<ReportsWorkflowFilter>([
  "all",
  "pending",
  "ready",
  "delivered",
  "failed",
]);

const DATE_URL_VALUES = new Set<ReportsDatePreset>([
  "today",
  "yesterday",
  "week",
  "month",
  "custom",
]);

function parseWorkflowParam(value: string | null): ReportsWorkflowFilter {
  const v = (value ?? "").trim().toLowerCase() as ReportsWorkflowFilter;
  return WORKFLOW_URL_VALUES.has(v) ? v : "all";
}

function parseDateParam(value: string | null): ReportsDatePreset {
  const v = (value ?? "").trim().toLowerCase() as ReportsDatePreset;
  if (DATE_URL_VALUES.has(v)) return v;
  return "today";
}

/** Completion queue filter state from URL (defaults: workflow=all, date=today). */
export function parseCompletionQueueSearchParams(
  params: Pick<URLSearchParams, "get"> | null | undefined,
): ReportsQueueFilterState {
  const q = (params?.get("q") ?? "").trim();
  return {
    workflow: parseWorkflowParam(params?.get("workflow")),
    datePreset: parseDateParam(params?.get("date")),
    customFrom: params?.get("from")?.trim() || undefined,
    customTo: params?.get("to")?.trim() || undefined,
    urgentOnly: parseBoolFlag(params?.get("urgent")),
    tatBreachedOnly: parseBoolFlag(params?.get("tat")),
    tatSoonOnly: parseBoolFlag(params?.get("tat30")),
    searchQ: q,
  };
}

export type CompletionQueueUrlPatch = Partial<ReportsQueueFilterState>;

export function buildCompletionQueueSearchParams(
  existing: URLSearchParams,
  patch: CompletionQueueUrlPatch,
): URLSearchParams {
  const params = new URLSearchParams(existing.toString());
  const state = { ...DEFAULT_REPORTS_QUEUE_FILTERS, ...parseCompletionQueueSearchParams(params), ...patch };

  if (state.workflow === "all") params.delete("workflow");
  else params.set("workflow", state.workflow);

  if (state.datePreset === "today") params.delete("date");
  else params.set("date", state.datePreset);

  if (state.datePreset === "custom" && state.customFrom) params.set("from", state.customFrom);
  else params.delete("from");
  if (state.datePreset === "custom" && state.customTo) params.set("to", state.customTo);
  else params.delete("to");

  if (state.urgentOnly) params.set("urgent", "1");
  else params.delete("urgent");
  if (state.tatBreachedOnly) params.set("tat", "1");
  else params.delete("tat");
  if (state.tatSoonOnly) params.set("tat30", "1");
  else params.delete("tat30");

  const q = state.searchQ.trim();
  if (q) params.set("q", q);
  else params.delete("q");

  return params;
}
