import type {
  AdvancedWorkspaceFilters,
  ClinicalReportStatus,
  OperationalQueue,
  QuickClinicalFilter,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { EMPTY_ADVANCED_FILTERS } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

export type WorkspaceUrlState = {
  q: string;
  queue: OperationalQueue | null;
  quickFilter: QuickClinicalFilter | null;
  patientId: string | null;
  reportId: string | null;
  consultationId: string | null;
  encounterId: string | null;
  page: number;
  advanced: AdvancedWorkspaceFilters;
  embed: boolean;
  demo: boolean;
};

const QUEUES: ReadonlySet<string> = new Set(["reports_ready", "critical", "awaiting"]);

const QUICK: ReadonlySet<string> = new Set([
  "my_patients",
  "reports_ready",
  "awaiting",
  "today",
]);

const STATUSES: ReadonlySet<string> = new Set([
  "AWAITING_REPORT",
  "AVAILABLE",
  "UPDATED",
]);

export function parseWorkspaceUrlState(params: URLSearchParams): WorkspaceUrlState {
  const queueParam = params.get("queue") ?? params.get("bucket");
  let queue: OperationalQueue | null =
    queueParam && QUEUES.has(queueParam) ? (queueParam as OperationalQueue) : null;

  const legacyBucket = params.get("bucket");
  if (
    !queue &&
    (legacyBucket === "pending_review" || legacyBucket === "needs_review")
  ) {
    queue = "reports_ready";
  }
  // Ignore legacy todays_uploaded
  if (queueParam === "todays_uploaded") queue = null;

  const quickParam = params.get("filter");
  // Legacy pending → needs_review
  const quickNormalized = quickParam === "pending" ? "reports_ready" : quickParam;
  const quickFilter =
    quickNormalized && QUICK.has(quickNormalized)
      ? (quickNormalized as QuickClinicalFilter)
      : null;

  const statusRaw = params.get("status") ?? "";
  const pageRaw = Number(params.get("page") || "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const advanced: AdvancedWorkspaceFilters = {
    dateFrom: params.get("date_from") ?? "",
    dateTo: params.get("date_to") ?? "",
    lab: params.get("lab") ?? "",
    category: params.get("category") ?? "",
    doctor: params.get("doctor") ?? "",
    branch: params.get("branch") ?? "",
    status:
      statusRaw && STATUSES.has(statusRaw)
        ? (statusRaw as ClinicalReportStatus)
        : "",
  };

  return {
    q: params.get("q") ?? "",
    queue,
    quickFilter,
    patientId: params.get("patientId"),
    reportId: params.get("reportId"),
    consultationId: params.get("consultationId"),
    encounterId: params.get("encounterId"),
    page,
    advanced,
    embed: params.get("embed") === "1",
    demo: params.get("demo") !== "0",
  };
}

export function workspaceStateToSearchParams(state: WorkspaceUrlState): URLSearchParams {
  const next = new URLSearchParams();
  if (state.q.trim()) next.set("q", state.q.trim());
  if (state.queue) next.set("queue", state.queue);
  if (state.quickFilter) next.set("filter", state.quickFilter);
  if (state.patientId) next.set("patientId", state.patientId);
  if (state.reportId) next.set("reportId", state.reportId);
  if (state.consultationId) next.set("consultationId", state.consultationId);
  if (state.encounterId) next.set("encounterId", state.encounterId);
  if (state.page > 1) next.set("page", String(state.page));
  const a = state.advanced ?? EMPTY_ADVANCED_FILTERS;
  if (a.dateFrom) next.set("date_from", a.dateFrom);
  if (a.dateTo) next.set("date_to", a.dateTo);
  if (a.lab) next.set("lab", a.lab);
  if (a.category) next.set("category", a.category);
  if (a.doctor) next.set("doctor", a.doctor);
  if (a.branch) next.set("branch", a.branch);
  if (a.status) next.set("status", a.status);
  if (state.embed) next.set("embed", "1");
  if (!state.demo) next.set("demo", "0");
  return next;
}
