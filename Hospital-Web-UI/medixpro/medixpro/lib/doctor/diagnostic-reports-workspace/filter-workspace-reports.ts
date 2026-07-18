import type {
  AdvancedWorkspaceFilters,
  OperationalQueue,
  OperationalQueueCounts,
  QuickClinicalFilter,
  WorkspaceListQuery,
  WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function withinDateRange(iso: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (from) {
    const fromT = Date.parse(from);
    if (!Number.isNaN(fromT) && t < fromT) return false;
  }
  if (to) {
    const toT = Date.parse(to);
    if (!Number.isNaN(toT) && t > toT + 86_400_000 - 1) return false;
  }
  return true;
}

export function matchesQueue(report: WorkspaceReport, queue: OperationalQueue): boolean {
  switch (queue) {
    case "reports_ready":
      return report.clinicalStatus === "AVAILABLE" || report.clinicalStatus === "UPDATED";
    case "critical":
      return false;
    case "awaiting":
      return report.clinicalStatus === "AWAITING_REPORT";
    default:
      return true;
  }
}

export function matchesQuickFilter(
  report: WorkspaceReport,
  filter: QuickClinicalFilter
): boolean {
  switch (filter) {
    case "my_patients":
      return true;
    case "today":
      return (
        isToday(report.uploadedAt) ||
        isToday(report.reportDate) ||
        isToday(report.collectionDate)
      );
    case "reports_ready":
      return matchesQueue(report, "reports_ready");
    case "awaiting":
      return matchesQueue(report, "awaiting");
    default:
      return true;
  }
}

export function matchesSearch(report: WorkspaceReport, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    report.patient.name,
    report.patient.mobile ?? "",
    report.patient.identifier,
    report.patient.id,
    report.reportNumber,
    report.testName,
    report.labName,
    report.category,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function matchesAdvanced(
  report: WorkspaceReport,
  advanced?: AdvancedWorkspaceFilters
): boolean {
  if (!advanced) return true;
  if (advanced.lab && report.labName !== advanced.lab) return false;
  if (advanced.category && report.category !== advanced.category) return false;
  if (advanced.doctor && report.doctorName !== advanced.doctor) return false;
  if (advanced.branch && report.branchName !== advanced.branch) return false;
  if (advanced.status && report.clinicalStatus !== advanced.status) return false;
  const dateIso = report.reportDate ?? report.uploadedAt;
  if (!withinDateRange(dateIso, advanced.dateFrom, advanced.dateTo)) return false;
  return true;
}

/** Pending clinical review first, then newest report date. */
export function sortReportsForBrowser(reports: WorkspaceReport[]): WorkspaceReport[] {
  return [...reports].sort((a, b) => {
    const aPending = matchesQueue(a, "reports_ready") ? 0 : 1;
    const bPending = matchesQueue(b, "reports_ready") ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    const ta = a.reportDate ?? a.uploadedAt ?? "";
    const tb = b.reportDate ?? b.uploadedAt ?? "";
    return tb.localeCompare(ta);
  });
}

export function filterReports(
  reports: WorkspaceReport[],
  query: WorkspaceListQuery
): WorkspaceReport[] {
  const filtered = reports.filter((r) => {
    if (query.patientId && r.patient.id !== query.patientId) return false;
    if (query.consultationId && r.consultationId !== query.consultationId) return false;
    if (query.encounterId && r.encounterId !== query.encounterId) return false;
    if (query.queue && !matchesQueue(r, query.queue)) return false;
    if (query.quickFilter && !matchesQuickFilter(r, query.quickFilter)) return false;
    if (query.q && !matchesSearch(r, query.q)) return false;
    if (!matchesAdvanced(r, query.advanced)) return false;
    return true;
  });
  return sortReportsForBrowser(filtered);
}

export function computeQueueCounts(reports: WorkspaceReport[]): OperationalQueueCounts {
  return {
    reports_ready: reports.filter((r) => matchesQueue(r, "reports_ready")).length,
    critical: reports.filter((r) => matchesQueue(r, "critical")).length,
    awaiting: reports.filter((r) => matchesQueue(r, "awaiting")).length,
  };
}

export function countActiveAdvancedFilters(advanced: AdvancedWorkspaceFilters): number {
  let n = 0;
  if (advanced.dateFrom) n += 1;
  if (advanced.dateTo) n += 1;
  // lab/doctor/branch are UUID-only API params — display-name values are ignored
  if (advanced.category) n += 1;
  if (advanced.status) n += 1;
  return n;
}
