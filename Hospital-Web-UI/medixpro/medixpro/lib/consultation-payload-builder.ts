import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";
import { sectionItemsToEndConsultationDiagnosisPayload } from "@/lib/consultation-diagnosis-helpers";
import {
  evaluateSectionItemComplete,
  normalizeItem,
  shouldShowInvestigationCustomTag,
} from "@/lib/consultation-completion";
import { buildInstructionsPayload } from "@/lib/consultation-instructions-helpers";
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
    const normalized = normalizeItem(inv);
    const detail = inv?.detail ?? {};
    const source =
      detail.recommendation_source === "diagnosis_map" ||
      detail.recommendation_source === "bundle"
        ? detail.recommendation_source
        : "manual";
    const rawUrgency = detail.urgency ?? "routine";
    const urgency =
      rawUrgency === "urgent" || rawUrgency === "stat" ? rawUrgency : "routine";
    const row: Record<string, unknown> = {
      service_id: String(detail.service_id ?? inv.id ?? ""),
      name: String(inv.label ?? inv.name ?? ""),
      is_custom: shouldShowInvestigationCustomTag(normalized),
      is_complete: evaluateSectionItemComplete("investigations", normalized),
      price_snapshot: detail.price_snapshot ?? null,
      recommendation_source: source,
      ...(detail.bundle_id ? { bundle_id: String(detail.bundle_id) } : {}),
      urgency,
      priority: urgency,
      instructions: Array.isArray(detail.instructions) ? detail.instructions : [],
      notes: String(detail.notes ?? ""),
      ...(source === "diagnosis_map" && detail.diagnosis_id
        ? { diagnosis_id: String(detail.diagnosis_id) }
        : {}),
    };
    if (detail.custom_investigation_type) {
      row.type = detail.custom_investigation_type;
    }
    if (store.encounterId) {
      row.encounter_id = store.encounterId;
    }
    return row;
  });

  /** Draft rows from Zustand only; backend persists on POST .../consultation/complete/ only. */
  const instructions = buildInstructionsPayload(store.instructionsList ?? []);

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
