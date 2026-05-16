import type { CollectionType } from "@/lib/labs/constants/collection-type";
import type { OrderStatus } from "@/lib/labs/constants/status";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";

/** Wire format for GET /api/labs/orders/ list rows. */
export type LabOrderListItem = {
  id: string;
  order_number: string;
  patient_name: string;
  patient_phone: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_address?: string | null;
  doctor_name: string;
  clinic_name?: string | null;
  test_names: string[];
  collection_type: CollectionType;
  preferred_slot_label: string;
  urgency: UrgencyLevel;
  status: OrderStatus;
  created_at: string;
  assignment_id?: string;
  sample_status?: string | null;
  report_status?: string | null;
  home_collection?: boolean;
};

export type LabOrdersListResponse = {
  results: LabOrderListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};
