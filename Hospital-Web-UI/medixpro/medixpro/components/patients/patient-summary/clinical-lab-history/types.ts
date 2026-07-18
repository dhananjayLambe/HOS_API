/**
 * Stable Clinical Lab History types — Patient Summary contract.
 * Do NOT import WorkspaceReport UI types here.
 */

export type ClinicalLabStatus = "AWAITING_REPORT" | "AVAILABLE" | "UPDATED";

export type ClinicalLabHistorySummary = {
  totalReports: number;
  pending: number;
  latestDate: string | null;
  latestLab: string | null;
};

export type ClinicalLabHistoryItem = {
  id: string;
  reportNumber: string | null;
  testName: string;
  category: string | null;
  labName: string | null;
  branchName: string | null;
  doctorName: string | null;
  consultationId: string | null;
  consultationLabel: string | null;
  prescriptionId: string | null;
  encounterId: string | null;
  collectionDate: string | null;
  reportDate: string | null;
  uploadedAt: string | null;
  clinicalStatus: ClinicalLabStatus;
  clinicalFindingsPreview: string | null;
  version: number;
  isLatest: boolean;
  supersededById: string | null;
  source: string;
  lifecycleState: string;
  primaryArtifactKind: string | null;
  artifactCount: number;
};

export type ClinicalLabHistoryListResult = {
  items: ClinicalLabHistoryItem[];
  nextCursor: string | null;
  pageSize: number;
};

export type ClinicalLabHistoryArtifact = {
  id: string;
  label: string;
  kind: string;
  previewUrl: string | null;
  downloadUrl: string;
  isPrimary: boolean;
};

export type ClinicalLabHistoryDetail = ClinicalLabHistoryItem & {
  clinicalFindings: string | null;
  artifacts: ClinicalLabHistoryArtifact[];
  timeline: {
    orderedAt: string | null;
    collectedAt: string | null;
    uploadedAt: string | null;
  };
};

export type ClinicalLabHistoryFilters = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ClinicalLabStatus | "";
  cursor?: string | null;
  pageSize?: number;
};

export const CLINICAL_LAB_STATUS_LABELS: Record<ClinicalLabStatus, string> = {
  AWAITING_REPORT: "Awaiting Report",
  AVAILABLE: "Available",
  UPDATED: "Updated",
};
