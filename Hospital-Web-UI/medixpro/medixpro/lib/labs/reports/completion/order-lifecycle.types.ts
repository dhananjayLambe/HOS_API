/** Internal operational tokens — never shown verbatim in UI copy. */

export type ReportLifecycleStatus =
  | "pending"
  | "uploaded"
  | "ready"
  | "sent"
  | "failed_upload"
  | "failed_delivery"
  | "failed"
  | "rejected"
  | "corrected";

export type ReportChipStatus = ReportLifecycleStatus;

export type ReportDeliveryState = "not_sent" | "sent" | "delivered" | "viewed" | "failed";

export type ReportArtifactType = "PRIMARY_REPORT" | "SUPPORTING_FILE" | "RAW_MACHINE_DATA";

export type CorrectionType = "TYPO" | "VALUE_CHANGED" | "WRONG_PATIENT" | "DOCTOR_REVISION";

export type TestUploadState = "PENDING" | "UPLOADED" | "CORRECTED" | "FAILED";

export type TestDeliveryState = "NOT_SENT" | "READY" | "SENT" | "FAILED";

export type TestWorkflowAction =
  | "UPLOAD"
  | "SEND"
  | "VIEW"
  | "REUPLOAD"
  | "DOWNLOAD"
  | "RETRY";

export type TestTimelineEvent = {
  id: string;
  atLabel: string;
  label: string;
};

export type TestWorkflowViewModel = {
  reportId: string;
  testName: string;
  uploadState: TestUploadState;
  deliveryState: TestDeliveryState;
  corrected: boolean;
  isReuploaded?: boolean;
  lastUpdatedLabel?: string;
  timeline: TestTimelineEvent[];
  availableActions: TestWorkflowAction[];
  artifacts: ReportArtifactViewModel[];
};

export type TatState = "safe" | "near_breach" | "breached";

export type AttentionReason =
  | "tat_breached"
  | "delivery_failed"
  | "stat_pending"
  | "stuck_partial";

export type CompletionFilterKey = "all" | "pending" | "ready" | "urgent" | "failed" | "delivered";

export type ReportArtifactViewModel = {
  id: string;
  fileName: string;
  mimeType: string;
  artifactType: ReportArtifactType;
  patientVisible: boolean;
  uploadedAtLabel?: string;
  uploadedByName?: string;
  versionNumber?: number;
  previewUrl?: string;
  downloadUrl?: string;
  previewFile?: File;
  previewText?: string;
  previewRows?: string[][];
  zipEntries?: string[];
};

export type ReportVersionViewModel = {
  versionId: string;
  versionNumber: number;
  label: string;
  isLatest: boolean;
  isCorrected?: boolean;
  status: ReportLifecycleStatus;
  deliveryState: ReportDeliveryState;
  artifacts: ReportArtifactViewModel[];
  createdAtLabel?: string;
  createdByName?: string;
  reuploadReason?: string;
  correctionReason?: string;
  correctionType?: CorrectionType;
};

export type ReportChipViewModel = {
  reportId: string;
  testLabel: string;
  status: ReportChipStatus;
  deliveryState: ReportDeliveryState;
  artifacts: ReportArtifactViewModel[];
  versions: ReportVersionViewModel[];
  latestVersionId?: string;
  pendingReason?: string;
  lastUpdatedAtLabel?: string;
  lastUpdatedByName?: string;
  isReuploaded?: boolean;
  lastUpdatedLabel?: string;
  reuploadReason?: string;
  availableActions?: string[];
};

export type NextActionViewModel = {
  /** Single-line label after → e.g. "Upload ABPM Report" */
  line: string;
  uploadReportId?: string;
  uploadLabel?: string;
  sendLabel?: string;
  showSendAvailable: boolean;
  showUpload: boolean;
  retryReportId?: string;
  updatedReportId?: string;
  readyReportIds: string[];
};

export type DeliveryFailure = {
  reportId: string;
  testLabel: string;
  reason: string;
  phone: string;
};

export type LastActivity = {
  atLabel: string;
  byName: string;
};

export type AttentionItem = {
  id: string;
  taskId: string;
  reason: AttentionReason;
  /** Compact one-line display */
  line: string;
};

export type OrderLifecycleViewModel = {
  taskId: string;
  orderNumber: string;
  patientKey: string;
  patientName: string;
  patientPhone: string;
  tatState: TatState;
  tatLabel: string;
  urgency: "ROUTINE" | "URGENT" | "STAT";
  reports: ReportChipViewModel[];
  testWorkflows?: TestWorkflowViewModel[];
  nextAction: NextActionViewModel;
  deliveryFailure?: DeliveryFailure;
  lastActivity: LastActivity;
  attentionReasons: AttentionReason[];
  /** All uploaded and all sent — moves to Completed today */
  isFullyComplete: boolean;
  readyToSendCount: number;
  hasPendingUpload: boolean;
  orderWorkflowState?:
    | "pending_upload"
    | "partial_upload"
    | "ready_to_send"
    | "delivered"
    | "attention_required";
  orderWorkflowReason?: {
    code: string;
    message: string;
  };
  requiredReports?: number;
  uploadedRequiredReports?: number;
  totalReports?: number;
  uploadedReports?: number;
  deliveredReports?: number;
  pendingReports?: number;
  failedReports?: number;
  completedAtIso?: string | null;
  lastReportUploadedAtIso?: string | null;
  /** Phase 1 operational date filter anchor (report activity proxy). */
  operationalUpdatedAtIso?: string | null;
  slaAnchorIso?: string | null;
  tatBreached?: boolean;
  /** Temporary in-card feedback */
  inCardToast?: string;
};

export type CompletionKpis = {
  notStarted: number;
  inProgress: number;
  readyToSend: number;
  delivered: number;
  attentionRequired: number;
};

export type PatientOrderGroupViewModel = {
  patientKey: string;
  patientName: string;
  orders: OrderLifecycleViewModel[];
};
