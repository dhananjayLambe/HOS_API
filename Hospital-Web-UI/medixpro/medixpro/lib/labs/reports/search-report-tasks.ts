import type { ReportTask } from "@/lib/labs/reports/report-task";

export function searchReportTasks(tasks: ReportTask[], query: string): ReportTask[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;

  return tasks.filter((task) => {
    if (task.patientName.toLowerCase().includes(q)) return true;
    if (task.patientPhone.toLowerCase().includes(q)) return true;
    if (task.orderNumber.toLowerCase().includes(q)) return true;
    if (task.testLabel.toLowerCase().includes(q)) return true;
    if (task.testNames.some((name) => name.toLowerCase().includes(q))) return true;
    return false;
  });
}
