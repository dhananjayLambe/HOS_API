import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";
import { sectionItemsToEndConsultationDiagnosisPayload } from "@/lib/consultation-diagnosis-helpers";
import { evaluateSectionItemComplete, normalizeItem } from "@/lib/consultation-completion";
import { useConsultationStore } from "@/store/consultationStore";

export function buildEndConsultationPayload(
  store: ReturnType<typeof useConsultationStore.getState>
) {
  const symptomsFromSection = store.sectionItems["symptoms"];
  const symptomsRaw =
    Array.isArray(symptomsFromSection) && symptomsFromSection.length > 0
      ? symptomsFromSection
      : store.symptoms ?? [];
  const symptoms = (Array.isArray(symptomsRaw) ? symptomsRaw : []).map((s: any) => {
    const normalized = normalizeItem(s);
    return {
      id: normalized.id,
      name: normalized.name,
      is_custom: normalized.is_custom,
      is_complete: evaluateSectionItemComplete("symptoms", normalized),
      meta: normalized.meta,
      detail: s?.detail,
    };
  });

  const medicinesFromSection = store.sectionItems["medicines"];
  const medicines = (
    Array.isArray(medicinesFromSection) && medicinesFromSection.length > 0
      ? medicinesFromSection
      : store.medicines ?? []
  ).map((m: any) => {
    const normalized = normalizeItem(m);
    return {
      ...m,
      name: normalized.name,
      is_custom: normalized.is_custom,
      is_complete: evaluateSectionItemComplete("medicines", normalized),
      meta: normalized.meta,
    };
  });

  const investigationsFromSection = store.sectionItems["investigations"];
  const investigationsRaw =
    Array.isArray(investigationsFromSection) && investigationsFromSection.length > 0
      ? investigationsFromSection
      : [];
  const investigations = investigationsRaw.map((inv: any) => {
    const detail = inv?.detail ?? {};
    const source =
      detail.recommendation_source === "diagnosis_map" ||
      detail.recommendation_source === "bundle"
        ? detail.recommendation_source
        : "manual";
    return {
      service_id: String(detail.service_id ?? inv.id ?? ""),
      name: String(inv.label ?? inv.name ?? ""),
      price_snapshot: detail.price_snapshot ?? null,
      recommendation_source: source,
      ...(detail.bundle_id ? { bundle_id: String(detail.bundle_id) } : {}),
      urgency: detail.urgency === "urgent" ? "urgent" : "routine",
      instructions: Array.isArray(detail.instructions) ? detail.instructions : [],
      notes: String(detail.notes ?? ""),
      ...(source === "diagnosis_map" && detail.diagnosis_id
        ? { diagnosis_id: String(detail.diagnosis_id) }
        : {}),
    };
  });

  const instructionsFromSection = store.sectionItems["instructions"];
  const instructions =
    Array.isArray(instructionsFromSection) && instructionsFromSection.length > 0
      ? instructionsFromSection
      : store.instructionsList ?? [];

  return {
    mode: "commit",
    store: {
      sectionItems: {
        symptoms,
        findings: draftFindingsToEndConsultationPayload(store.draftFindings ?? []),
        diagnosis: sectionItemsToEndConsultationDiagnosisPayload(
          store.sectionItems["diagnosis"] ?? []
        ),
        medicines,
        investigations,
        instructions,
      },
      meta: {
        consultation_type: store.consultationType ?? "FULL",
        follow_up: {
          date: store.follow_up_date ?? "",
          interval: store.follow_up_interval ?? 0,
          unit: store.follow_up_unit ?? "days",
          reason: store.follow_up_reason ?? "",
        },
      },
    },
  };
}
