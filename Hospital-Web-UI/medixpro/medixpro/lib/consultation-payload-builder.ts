import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";
import { sectionItemsToEndConsultationDiagnosisPayload } from "@/lib/consultation-diagnosis-helpers";
import {
  evaluateSectionItemComplete,
  normalizeItem,
  shouldShowInvestigationCustomTag,
} from "@/lib/consultation-completion";
import { buildInstructionsPayload } from "@/lib/consultation-instructions-helpers";
import type { FollowUpUnit } from "@/lib/consultation-types";
import { useConsultationStore } from "@/store/consultationStore";

/** Map legacy UI values to API contract (days | weeks). */
function normalizeFollowUpUnit(unit: FollowUpUnit | string | undefined | null): "days" | "weeks" {
  const u = String(unit ?? "days")
    .trim()
    .toLowerCase();
  if (u === "week" || u === "weeks" || u === "month" || u === "months") return "weeks";
  return "days";
}

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

  const meta: Record<string, unknown> = {
    consultation_type: store.consultationType ?? "FULL",
  };

  if (store.follow_up_payload_touched) {
    const dateStr = (store.follow_up_date ?? "").trim();
    const interval = Number(store.follow_up_interval ?? 0) || 0;
    const reason = (store.follow_up_reason ?? "").trim();
    const early = Boolean(store.follow_up_early_if_persist);
    if (!dateStr && interval <= 0 && !reason && !early) {
      meta.follow_up = {};
    } else {
      meta.follow_up = {
        date: dateStr,
        interval,
        unit: normalizeFollowUpUnit(store.follow_up_unit),
        reason,
        early_if_persist: store.follow_up_early_if_persist ?? false,
      };
    }
  }

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
      meta,
    },
  };
}
