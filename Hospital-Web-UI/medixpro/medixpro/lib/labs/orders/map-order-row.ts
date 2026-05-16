import type { LabOrderListItem } from "@/lib/labs/api/orders-types";
import type { LabOrderRow } from "@/lib/labs/types";

/** Maps list API DTO → UI/detail row; drawer-only fields use safe defaults until detail API exists. */
export function mapLabOrderListItem(dto: LabOrderListItem, branchLabel = ""): LabOrderRow {
  return {
    id: dto.order_number || dto.id,
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
      homeEligible: dto.collection_type === "HOME",
    })),
    collectionType: dto.collection_type,
    preferredSlot: dto.preferred_slot_label,
    branch: branchLabel,
    status: dto.status,
    createdAt: formatCreatedAt(dto.created_at),
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
