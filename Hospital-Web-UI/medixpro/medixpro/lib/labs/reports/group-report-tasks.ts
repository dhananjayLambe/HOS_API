import type { ReportTask } from "@/lib/labs/reports/report-task";
import {
  isPendingUploadStatus,
  type ReportOperationalStatus,
} from "@/lib/labs/reports/report-operational-status";

export type PatientReportGroup = {
  patientKey: string;
  patientName: string;
  patientPhone: string;
  tasks: ReportTask[];
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  uploadedCount: number;
  progressLabel: string;
  severityScore: number;
};

const UPLOADED_STATUSES: ReportOperationalStatus[] = [
  "UPLOADED",
  "READY_DELIVERY",
  "DELIVERED",
];

function isUploadedStatus(status: ReportOperationalStatus): boolean {
  return UPLOADED_STATUSES.includes(status);
}

function groupSeverityScore(tasks: ReportTask[]): number {
  const statuses = tasks.map((t) => t.operationalStatus);
  if (statuses.some(isPendingUploadStatus)) return 1;
  if (statuses.includes("FAILED_DELIVERY")) return 2;
  if (statuses.includes("READY_DELIVERY")) return 3;
  if (statuses.includes("UPLOADED")) return 4;
  return 5;
}

function buildGroup(
  patientKey: string,
  patientName: string,
  patientPhone: string,
  tasks: ReportTask[],
): PatientReportGroup {
  const pendingCount = tasks.filter((t) => isPendingUploadStatus(t.operationalStatus)).length;
  const completedCount = tasks.filter((t) => t.operationalStatus === "DELIVERED").length;
  const uploadedCount = tasks.filter((t) => isUploadedStatus(t.operationalStatus)).length;
  const totalCount = tasks.length;
  return {
    patientKey,
    patientName,
    patientPhone,
    tasks,
    pendingCount,
    completedCount,
    totalCount,
    uploadedCount,
    progressLabel:
      totalCount > 0
        ? `${uploadedCount} of ${totalCount} report${totalCount === 1 ? "" : "s"} uploaded`
        : "",
    severityScore: groupSeverityScore(tasks),
  };
}

export function groupTasksByPatient(tasks: ReportTask[]): PatientReportGroup[] {
  const map = new Map<string, ReportTask[]>();

  for (const task of tasks) {
    const list = map.get(task.patientKey) ?? [];
    list.push(task);
    map.set(task.patientKey, list);
  }

  const groups: PatientReportGroup[] = [];
  for (const [patientKey, patientTasks] of map) {
    const first = patientTasks[0]!;
    groups.push(buildGroup(patientKey, first.patientName, first.patientPhone, patientTasks));
  }

  return groups;
}

export function sortWorkflowGroups(groups: PatientReportGroup[]): PatientReportGroup[] {
  return [...groups].sort((a, b) => {
    if (a.severityScore !== b.severityScore) return a.severityScore - b.severityScore;
    return a.patientName.localeCompare(b.patientName, undefined, { sensitivity: "base" });
  });
}

export function defaultGroupsExpanded(patientCount: number, isMobile: boolean): boolean {
  if (isMobile) return false;
  return patientCount <= 5;
}

/** Desktop upload/list helper — collapse when many patient groups. */
export function defaultGroupsCollapsed(patientCount: number): boolean {
  return patientCount > 5;
}
