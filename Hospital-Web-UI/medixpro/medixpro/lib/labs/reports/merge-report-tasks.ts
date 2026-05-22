import type { ReportTask } from "@/lib/labs/reports/report-task";

/** Live tasks win on duplicate taskId; demo tasks fill gaps for testing. */
export function mergeReportTasks(live: ReportTask[], demo: ReportTask[]): ReportTask[] {
  const map = new Map<string, ReportTask>();
  for (const task of live) {
    map.set(task.taskId, task);
  }
  for (const task of demo) {
    if (!map.has(task.taskId)) {
      map.set(task.taskId, task);
    }
  }
  return Array.from(map.values());
}
