import type { CollectionStatus } from "@/lib/labs/constants/status";

export type HomeCollectionActionKey =
  | "assign"
  | "start"
  | "collect"
  | "fail"
  | "retry"
  | "view_execution";

export type HomeCollectionListItem = {
  id: string;
  order_number: string;
  order_uuid: string;
  assignment_id: string | null;
  patient_name: string;
  patient_phone: string;
  patient_age: number | null;
  patient_gender: string;
  test_count: number;
  test_names: string[];
  test_names_overflow: number;
  preferred_date: string;
  preferred_slot: string;
  confirmed_date: string | null;
  confirmed_slot: string | null;
  slot_date_label: string;
  slot_time_label: string;
  assigned_phlebotomist_id: string | null;
  assigned_phlebotomist_name: string | null;
  assignment_note: string;
  collection_status: CollectionStatus;
  workflow_hint: string;
  allowed_actions: HomeCollectionActionKey[];
  address_snapshot: Record<string, unknown>;
  address_formatted: string;
  patient_notes: string | null;
  internal_notes: string | null;
  assigned_at: string | null;
  in_progress_at: string | null;
  collected_at: string | null;
  failed_at: string | null;
  retry_count: number;
  collection_type: string;
};

export type HomeCollectionsListResponse = {
  results: HomeCollectionListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type HomeCollectionsSummary = {
  pending_collections: number;
  assigned_today: number;
  active_collections: number;
  collected_today: number;
  failed_no_response: number;
};

export type HomeCollectionWorkflowResponse = {
  success: boolean;
  collection_status: CollectionStatus;
  message: string;
  collection_id: string;
  allowed_actions: HomeCollectionActionKey[];
  assignment_note?: string;
};

export type PhlebotomistListItem = {
  id: string;
  name: string;
  role: string;
};
