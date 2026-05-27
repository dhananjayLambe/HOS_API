import type { ReportTask } from "@/lib/labs/reports/report-task";

function taskMatchesPatientSearch(patientName: string, query: string): boolean {
  const name = patientName.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (name.includes(q)) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;

  const parts = name.split(/\s+/).filter(Boolean);
  return tokens.every(
    (token) => name.includes(token) || parts.some((part) => part.includes(token)),
  );
}

export function searchReportTasks(tasks: ReportTask[], query: string): ReportTask[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;

  return tasks.filter((task) => {
    if (taskMatchesPatientSearch(task.patientName, q)) return true;
    if (task.patientPhone.toLowerCase().includes(q)) return true;
    if (task.orderNumber.toLowerCase().includes(q)) return true;
    if (task.testLabel.toLowerCase().includes(q)) return true;
    if (task.testNames.some((name) => name.toLowerCase().includes(q))) return true;
    return false;
  });
}
