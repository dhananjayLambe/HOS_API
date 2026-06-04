/** v1 diagnostics report API DTO types (transport layer only). */

export type ReportActionTargetsApi = {
  upload_report_id: string | null;
  mark_ready_report_id: string | null;
  send_whatsapp_report_id: string | null;
  retry_delivery_log_id: string | null;
};

export type ReportTaskApiItem = {
  task_id: string;
  assignment_id: string;
  order_uuid: string;
  order_number: string;
  patient_name: string;
  patient_phone: string;
  collection_type: string;
  test_label: string;
  operational_status: string;
  visit_or_slot_label: string;
  pending_sibling_count: number;
  uploaded_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  total_reports?: number;
  required_reports?: number;
  uploaded_reports?: number;
  uploaded_required_reports?: number;
  delivered_reports?: number;
  pending_reports?: number;
  failed_reports?: number;
  order_workflow_state?: string;
  order_workflow_reason?: {
    code?: string;
    message?: string;
  } | null;
  last_report_uploaded_at?: string | null;
  completed_at?: string | null;
  assigned_at?: string | null;
  sample_collected_at?: string | null;
  operational_anchor_at?: string | null;
  urgency?: string | null;
  available_action_targets: ReportActionTargetsApi;
};

export type ReportTaskListData = {
  results: ReportTaskApiItem[];
  next: string | null;
  previous: string | null;
  counts?: {
    pending_uploads?: number;
    ready_delivery?: number;
    delivered?: number;
    failed?: number;
  } | null;
};

export type ReportLineReportApiItem = {
  report_id: string;
  line_id: string;
  test_label: string;
  status: string;
  delivery_status: string;
  available_actions: string[];
};

export type ReportTaskContextApiData = {
  task_id: string;
  assignment_id: string;
  order_uuid: string;
  order_number: string;
  patient: {
    name: string;
    phone: string;
    encounter_id: string | null;
  };
  collection_type: string;
  visit_or_slot_label: string;
  operational_status: string;
  active_reports: ReportLineReportApiItem[];
  upload_target?: {
    report_id: string;
    line_id: string;
    operational_status: string;
  } | null;
};

export type ReportArtifactApiItem = {
  id: string;
  artifact_id?: string;
  artifact_type: string;
  original_filename: string | null;
  download_filename: string | null;
  file_size: number | null;
  content_type: string | null;
  is_primary: boolean;
  version: number;
  storage_state?: string;
  patient_account_uuid?: string | null;
  patient_profile_uuid?: string | null;
  source_type?: string | null;
  artifact_category?: string | null;
  retention_until?: string | null;
  legal_hold?: boolean;
  uploaded_at: string | null;
  uploaded_by?: string | null;
  download_url: string | null;
};

export type DeliveryLogApiItem = {
  id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  retry_count: number;
};

export type ReportDetailApiData = {
  report: {
    id: string;
    status: string;
    delivery_status: string;
    revision_number: number;
    ready_at: string | null;
    delivered_at: string | null;
  };
  patient: {
    name: string;
    phone: string;
    encounter_id: string | null;
  };
  artifacts: ReportArtifactApiItem[];
  delivery: DeliveryLogApiItem | null;
  history: {
    supersedes_id: string | null;
    superseded_by_id: string | null;
  };
  available_actions: string[];
};

export type ReportSummaryApiItem = {
  report_id: string;
  patient_name: string;
  test_label: string;
  status: string;
  delivery_status: string;
  primary_artifact_filename: string | null;
  updated_at: string;
};

export type ReportSummaryListData = {
  results: ReportSummaryApiItem[];
  next: string | null;
  previous: string | null;
};

export type UploadArtifactsApiData = {
  report_id: string;
  status: string;
  artifacts: ReportArtifactApiItem[];
};

export type MarkReadyApiData = {
  report_id: string;
  status: string;
  available_actions: string[];
};

export type SendWhatsAppApiData = {
  report_id: string;
  delivery_status: string;
  delivery_log_id: string;
  channel: string;
  available_actions: string[];
};

export type RetryDeliveryApiData = {
  new_delivery_log_id: string;
  parent_delivery_log_id: string;
  status: string;
};

export type ReportHistoryApiData = {
  report_id: string;
  supersedes_id: string | null;
  superseded_by_id: string | null;
  artifacts: ReportArtifactApiItem[];
  delivery_logs: DeliveryLogApiItem[];
};

export type ReportTasksListQueryParams = Record<string, string | number>;
