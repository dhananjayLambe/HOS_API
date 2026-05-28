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
  nextCursor: string | null;
  previousCursor: string | null;
  counts?: {
    pendingUploads: number;
    readyDelivery: number;
    delivered: number;
    failed: number;
  } | null;
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
  cursor: string | null,
  signal?: AbortSignal,
): Promise<LoadReportTasksResult> {
  const data = await getReportsQueue(
    buildReportTasksQueryParams(filters, { pageSize: REPORTS_PAGE_SIZE, cursor }),
    { signal },
  );
  return {
    tasks: mapReportTaskDtos(data.results, { labName: branchLabel }),
    source: "report-tasks-api",
    nextCursor: parseCursorFromLink(data.next),
    previousCursor: parseCursorFromLink(data.previous),
    counts: data.counts
      ? {
          pendingUploads: Math.max(0, Number(data.counts.pending_uploads ?? 0)),
          readyDelivery: Math.max(0, Number(data.counts.ready_delivery ?? 0)),
          delivered: Math.max(0, Number(data.counts.delivered ?? 0)),
          failed: Math.max(0, Number(data.counts.failed ?? 0)),
        }
      : null,
  };
}

function parseCursorFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    const parsed = new URL(link);
    const cursor = parsed.searchParams.get("cursor");
    return cursor && cursor.trim() ? cursor : null;
  } catch {
    return null;
  }
}

export async function loadReportTasks(
  options: {
    branchId?: string | null;
    branchLabel?: string;
    filters: ReportTasksQueryFilters;
    cursor?: string | null;
    signal?: AbortSignal;
  },
): Promise<LoadReportTasksResult> {
  const { branchLabel = "", filters, cursor = null, signal } = options;

  if (isReportTasksV1ApiEnabled()) {
    try {
      return await loadFromReportTasksApi(branchLabel, filters, cursor, signal);
    } catch (err) {
      trackReportEvent("queue_fetch_fail");
      throw err;
    }
  }

  const tasks = await loadFromOrdersFallback(branchLabel, filters, signal);
  return {
    tasks,
    source: "skipped-v1-api",
    nextCursor: null,
    previousCursor: null,
    counts: null,
  };
}
