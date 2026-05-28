import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { ReportTasksQueryFilters } from "@/lib/labs/reports/build-report-tasks-query";

export type ReportsQueueProviderMode = "live" | "demo";

export type LiveQueueSnapshot = {
  mode: "live";
  tasks: ReportTask[];
  nextCursor: string | null;
  previousCursor: string | null;
  counts?: {
    pendingUploads: number;
    readyDelivery: number;
    delivered: number;
    failed: number;
  } | null;
};

export type DemoQueueSnapshot = {
  mode: "demo";
  orders: OrderLifecycleViewModel[];
};

export type ReportsQueueSnapshot = LiveQueueSnapshot | DemoQueueSnapshot;

export type FetchLiveQueueParams = {
  branchId: string | null;
  branchLabel: string;
  filters: ReportTasksQueryFilters;
  cursor?: string | null;
  signal?: AbortSignal;
};

export interface ReportsQueueProvider {
  readonly mode: ReportsQueueProviderMode;
  fetchSnapshot(params: FetchLiveQueueParams): Promise<ReportsQueueSnapshot>;
}
