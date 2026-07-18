/**
 * Clinical view-models for the Diagnostic Reports Workspace.
 * Shapes match production DTOs from `doctor_report_workspace` (live API only).
 */

export type ClinicalReportStatus = "AWAITING_REPORT" | "AVAILABLE" | "UPDATED";

/** Hero KPI queues (todays_uploaded removed from UI; kept only for legacy URL ignore). */
export type OperationalQueue = "reports_ready" | "critical" | "awaiting";

export type QuickClinicalFilter =
  | "my_patients"
  | "reports_ready"
  | "awaiting"
  | "today";

export type ArtifactKind =
  | "PDF"
  | "IMAGE"
  | "CSV"
  | "XLSX"
  | "DOCX"
  | "TXT"
  | "ZIP"
  | "DICOM"
  | "OTHER";

export type WorkspacePatient = {
  id: string;
  name: string;
  age: number | null;
  gender: string;
  identifier: string;
  mobile: string | null;
  lastVisitAt: string | null;
  currentConsultationId: string | null;
  currentConsultationLabel: string | null;
};

export type WorkspaceArtifact = {
  id: string;
  label: string;
  kind: ArtifactKind;
  previewUrl: string | null;
  downloadUrl: string;
  isPrimary: boolean;
};

export type WorkspaceTimeline = {
  orderedAt: string | null;
  collectedAt: string | null;
  uploadedAt: string | null;
};

export type WorkspaceReport = {
  id: string;
  reportNumber: string | null;
  patient: WorkspacePatient;
  testName: string;
  category: string | null;
  labName: string | null;
  doctorName: string | null;
  branchName: string | null;
  consultationId: string | null;
  consultationLabel: string | null;
  encounterId: string | null;
  collectionDate: string | null;
  reportDate: string | null;
  uploadedAt: string | null;
  clinicalStatus: ClinicalReportStatus;
  clinicalFindingsPreview: string | null;
  clinicalFindings: string | null;
  artifacts: WorkspaceArtifact[];
  timeline: WorkspaceTimeline;
};

export type OperationalQueueCounts = {
  reports_ready: number;
  critical: number;
  awaiting: number;
};

export type AdvancedWorkspaceFilters = {
  dateFrom: string;
  dateTo: string;
  lab: string;
  category: string;
  doctor: string;
  branch: string;
  status: ClinicalReportStatus | "";
};

export const EMPTY_ADVANCED_FILTERS: AdvancedWorkspaceFilters = {
  dateFrom: "",
  dateTo: "",
  lab: "",
  category: "",
  doctor: "",
  branch: "",
  status: "",
};

export type WorkspaceListQuery = {
  q?: string;
  queue?: OperationalQueue | null;
  quickFilter?: QuickClinicalFilter | null;
  patientId?: string | null;
  consultationId?: string | null;
  encounterId?: string | null;
  /** Opaque keyset cursor from prior `pagination.next_cursor` (server pagination). */
  cursor?: string | null;
  advanced?: AdvancedWorkspaceFilters;
};

export type WorkspaceListResult = {
  reports: WorkspaceReport[];
  nextCursor: string | null;
};

export type DiagnosticReportsWorkspaceProvider = {
  getQueueCounts: (query?: WorkspaceListQuery) => Promise<OperationalQueueCounts>;
  searchPatients: (q: string) => Promise<WorkspacePatient[]>;
  listReports: (query: WorkspaceListQuery) => Promise<WorkspaceListResult>;
  getReportDetail: (reportId: string) => Promise<WorkspaceReport | null>;
};

export const CLINICAL_STATUS_LABELS: Record<ClinicalReportStatus, string> = {
  AWAITING_REPORT: "Awaiting Report",
  AVAILABLE: "Available",
  UPDATED: "Updated",
};

export const BROWSER_PAGE_SIZE = 25;
