import type { HomeCollectionListItem } from "@/lib/labs/api/home-collections-types";
import type { CollectionStatus } from "@/lib/labs/constants/status";
import type { HomeCollectionRow } from "@/lib/labs/types";

export function mapHomeCollectionListItem(dto: HomeCollectionListItem): HomeCollectionRow {
  return {
    id: dto.id,
    orderNumber: dto.order_number,
    orderUuid: dto.order_uuid,
    assignmentId: dto.assignment_id,
    patientName: dto.patient_name,
    patientPhone: dto.patient_phone,
    patientAge: dto.patient_age,
    patientGender: dto.patient_gender,
    testCount: dto.test_count,
    testNames: dto.test_names,
    testNamesOverflow: dto.test_names_overflow,
    slotDateLabel: dto.slot_date_label,
    slotTimeLabel: dto.slot_time_label,
    preferredDate: dto.preferred_date,
    preferredSlot: dto.preferred_slot,
    confirmedDate: dto.confirmed_date,
    confirmedSlot: dto.confirmed_slot,
    assigneeName: dto.assigned_phlebotomist_name,
    assigneeId: dto.assigned_phlebotomist_id,
    assignmentNote: dto.assignment_note ?? "",
    status: dto.collection_status as CollectionStatus,
    workflowHint: dto.workflow_hint,
    allowedActions: dto.allowed_actions,
    addressFormatted: dto.address_formatted,
    addressSnapshot: dto.address_snapshot,
    patientNotes: dto.patient_notes,
    internalNotes: dto.internal_notes,
    assignedAt: dto.assigned_at,
    inProgressAt: dto.in_progress_at,
    collectedAt: dto.collected_at,
    failedAt: dto.failed_at,
    retryCount: dto.retry_count,
    collectionType: dto.collection_type,
  };
}

export function patchRowFromWorkflow(
  row: HomeCollectionRow,
  res: {
    collection_status: CollectionStatus;
    allowed_actions: HomeCollectionRow["allowedActions"];
    assignment_note?: string;
  },
): HomeCollectionRow {
  const noteFromResponse = (res.assignment_note ?? "").trim();
  return {
    ...row,
    status: res.collection_status,
    allowedActions: res.allowed_actions,
    assignmentNote: noteFromResponse || row.assignmentNote,
  };
}
