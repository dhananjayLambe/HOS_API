import type { CollectionType } from "@/lib/labs/constants/collection-type";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";

export type ReportTaskFilter = {
  status?: ReportOperationalStatus;
  urgentOnly?: boolean;
  tatBreached?: boolean;
  labName?: string;
  collectionType?: CollectionType | "all";
};

export function filterReportTasks(tasks: ReportTask[], filter: ReportTaskFilter): ReportTask[] {
  return tasks.filter((task) => {
    if (filter.status && task.operationalStatus !== filter.status) return false;
    if (filter.urgentOnly) {
      const u = task.urgency.toUpperCase();
      if (u !== "URGENT" && u !== "STAT") return false;
    }
    if (filter.tatBreached && !task.tatBreached) return false;
    if (filter.labName?.trim()) {
      const lab = filter.labName.trim().toLowerCase();
      if (!task.labName.toLowerCase().includes(lab)) return false;
    }
    if (filter.collectionType && filter.collectionType !== "all") {
      if (task.collectionType !== filter.collectionType) return false;
    }
    return true;
  });
}
