import { loadReportTasks } from "@/lib/labs/reports/load-report-tasks";
import { fallbackOrderFromTask } from "@/lib/labs/reports/completion/fallback-order-from-task";
import type {
  FetchLiveQueueParams,
  LiveQueueSnapshot,
  ReportsQueueProvider,
} from "@/lib/labs/reports/completion/queue-providers/types";

export const liveQueueProvider: ReportsQueueProvider = {
  mode: "live",
  async fetchSnapshot(params: FetchLiveQueueParams): Promise<LiveQueueSnapshot> {
    const snapshot = await loadReportTasks({
      branchId: params.branchId,
      branchLabel: params.branchLabel,
      filters: params.filters,
      cursor: params.cursor ?? null,
      signal: params.signal,
    });
    return {
      mode: "live",
      tasks: snapshot.tasks,
      nextCursor: snapshot.nextCursor,
      previousCursor: snapshot.previousCursor,
      counts: snapshot.counts ?? null,
    };
  },
};

/** Map queue tasks to stub view models for KPI / filter derivation before context hydration. */
export function stubOrdersFromTasks(
  tasks: import("@/lib/labs/reports/report-task").ReportTask[],
) {
  return tasks.map(fallbackOrderFromTask);
}
