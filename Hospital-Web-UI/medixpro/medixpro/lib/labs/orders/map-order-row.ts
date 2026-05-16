import type { LabOrderListItem } from "@/lib/labs/api/orders-types";
import { resolveAllowedActions } from "@/lib/labs/orders/order-workflow-config";
import type { LabOrderRow } from "@/lib/labs/types";

/** Maps list API DTO → UI/detail row. */
export function mapLabOrderListItem(dto: LabOrderListItem, branchLabel = ""): LabOrderRow {
  const homeCollection = dto.home_collection ?? dto.collection_type === "HOME";
  return {
    id: dto.order_number || dto.id,
    assignmentId: dto.assignment_id ?? dto.id,
    orderUuid: dto.id,
    patient: dto.patient_name,
    patientPhone: dto.patient_phone,
    patientAge: dto.patient_age ?? 0,
    patientGender: dto.patient_gender ?? "—",
    patientAddress: dto.patient_address ?? "",
    doctor: dto.doctor_name,
    clinic: dto.clinic_name ?? "",
    tests: dto.test_names.map((name) => ({
      name,
      category: "",
      urgency: dto.urgency,
      homeEligible: homeCollection,
    })),
    collectionType: dto.collection_type,
    preferredSlot: dto.preferred_slot_label,
    branch: branchLabel,
    status: dto.status,
    sampleStatus: dto.sample_status ?? null,
    reportStatus: dto.report_status ?? null,
    homeCollection,
    allowedActions: resolveAllowedActions(dto.status),
    createdAt: formatCreatedAt(dto.created_at),
    assignedAtIso: dto.assigned_at ?? dto.created_at ?? null,
    acceptedAt: dto.accepted_at ? formatCreatedAt(dto.accepted_at) : null,
    rejectedAt: dto.rejected_at ? formatCreatedAt(dto.rejected_at) : null,
    rejectionReason: dto.rejection_reason ?? null,
    urgency: dto.urgency,
    timeline: [],
    notes: undefined,
  };
}

function formatCreatedAt(created_at: string): string {
  if (!created_at) return "";
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return created_at;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapLabOrderListItems(items: LabOrderListItem[], branchLabel = ""): LabOrderRow[] {
  return items.map((item) => mapLabOrderListItem(item, branchLabel));
}
