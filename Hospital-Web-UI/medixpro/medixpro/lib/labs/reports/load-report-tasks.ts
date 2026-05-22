import { fetchLabOrdersList } from "@/lib/labs/api/orders";
import { getReportsQueue } from "@/lib/labs/reports/api/v1/reports-api";
import { mapReportTaskDtos } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import { mapLabOrderListItems } from "@/lib/labs/orders/map-order-row";
import {
  buildReportTasksQueryParams,
  DEFAULT_REPORT_TASKS_FILTERS,
  REPORT_QUEUE_PAGE_SIZE,
  type ReportTasksQueryFilters,
} from "@/lib/labs/reports/build-report-tasks-query";
import { isReportTasksV1ApiEnabled } from "@/lib/labs/reports/report-tasks-config";
import { buildReportTasksFromOrders, type ReportTask } from "@/lib/labs/reports/report-task";
import { trackReportEvent } from "@/lib/labs/reports/report-monitoring";

const REPORTS_PAGE_SIZE = REPORT_QUEUE_PAGE_SIZE;
const COMPLETED_PAGE_SIZE = 50;

export type LoadReportTasksSource =
  | "report-tasks-api"
  | "labs-orders-fallback"
  | "skipped-v1-api";

export type LoadReportTasksResult = {
  tasks: ReportTask[];
  source: LoadReportTasksSource;
};

async function loadFromOrdersFallback(
  branchLabel: string,
  filters: ReportTasksQueryFilters,
  signal?: AbortSignal,
): Promise<ReportTask[]> {
  const base = { ...DEFAULT_REPORT_TASKS_FILTERS, collectionType: filters.collectionType, datePreset: filters.datePreset };
  const q = (filters.search ?? "").trim();
  const [inProgressRes, completedRes] = await Promise.all([
    fetchLabOrdersList(
      { filters: { ...base, status: "IN_PROGRESS" }, page: 1, pageSize: REPORTS_PAGE_SIZE, q },
      { signal },
    ),
    fetchLabOrdersList(
      { filters: { ...base, status: "COMPLETED" }, page: 1, pageSize: COMPLETED_PAGE_SIZE, q },
      { signal },
    ),
  ]);

  const unique = new Map<string, ReturnType<typeof mapLabOrderListItems>[number]>();
  for (const row of [
    ...mapLabOrderListItems(inProgressRes.results, branchLabel),
    ...mapLabOrderListItems(completedRes.results, branchLabel),
  ]) {
    unique.set(row.assignmentId, row);
  }
  return buildReportTasksFromOrders(Array.from(unique.values()));
}

async function loadFromReportTasksApi(
  branchLabel: string,
  filters: ReportTasksQueryFilters,
  signal?: AbortSignal,
): Promise<ReportTask[]> {
  const data = await getReportsQueue(
    buildReportTasksQueryParams(filters, { pageSize: REPORTS_PAGE_SIZE }),
    { signal },
  );
  return mapReportTaskDtos(data.results, { labName: branchLabel });
}

export async function loadReportTasks(
  options: {
    branchId?: string | null;
    branchLabel?: string;
    filters: ReportTasksQueryFilters;
    signal?: AbortSignal;
  },
): Promise<LoadReportTasksResult> {
  const { branchLabel = "", filters, signal } = options;

  if (isReportTasksV1ApiEnabled()) {
    try {
      const apiTasks = await loadFromReportTasksApi(branchLabel, filters, signal);
      return { tasks: apiTasks, source: "report-tasks-api" };
    } catch (err) {
      trackReportEvent("queue_fetch_fail");
      throw err;
    }
  }

  const tasks = await loadFromOrdersFallback(branchLabel, filters, signal);
  return { tasks, source: "skipped-v1-api" };
}
