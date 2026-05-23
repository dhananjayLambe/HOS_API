import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";
import {
  prunePayload,
  type TemplateItemSchema,
} from "@/lib/consultation-template-engine";
import { sectionItemsToEndConsultationDiagnosisPayload } from "@/lib/consultation-diagnosis-helpers";
import {
  evaluateSectionItemComplete,
  normalizeItem,
  shouldShowInvestigationCustomTag,
} from "@/lib/consultation-completion";
import { buildInstructionsPayload } from "@/lib/consultation-instructions-helpers";
import type { FollowUpUnit } from "@/lib/consultation-types";
import { isInvestigationServiceUuid } from "@/lib/investigation-canonical";
import { useConsultationStore } from "@/store/consultationStore";

/** Map legacy UI values to API contract (days | weeks). */
function normalizeFollowUpUnit(unit: FollowUpUnit | string | undefined | null): "days" | "weeks" {
  const u = String(unit ?? "days")
    .trim()
    .toLowerCase();
  if (u === "week" || u === "weeks" || u === "month" || u === "months") return "weeks";
  return "days";
}

/** Normalize medicine aliases that backend master data does not accept directly. */
function normalizeMedicineForApi(medicine: Record<string, unknown>): Record<string, unknown> {
  const doseUnitRaw = String(medicine.dose_unit_id ?? medicine.dose_unit ?? "")
    .trim()
    .toLowerCase();
  let doseUnitId = String(medicine.dose_unit_id ?? "").trim().toLowerCase();
  if (!doseUnitId) {
    doseUnitId = doseUnitRaw;
  }
  if (doseUnitId === "gm") {
    doseUnitId = "g";
  }
  return {
    ...medicine,
    dose_unit_id: doseUnitId,
  };
}

function normalizeMedicineRowForApi(row: Record<string, unknown>): Record<string, unknown> {
  const normalizedRow = normalizeMedicineForApi(row);
  const rowMedicine =
    normalizedRow.medicine && typeof normalizedRow.medicine === "object"
      ? normalizeMedicineForApi(normalizedRow.medicine as Record<string, unknown>)
      : normalizedRow.medicine;
  const detail =
    normalizedRow.detail && typeof normalizedRow.detail === "object"
      ? (normalizedRow.detail as Record<string, unknown>)
      : null;
  const normalizedDetailMedicine =
    detail?.medicine && typeof detail.medicine === "object"
      ? normalizeMedicineForApi(detail.medicine as Record<string, unknown>)
      : detail?.medicine;
  return {
    ...normalizedRow,
    ...(rowMedicine && typeof rowMedicine === "object" ? { medicine: rowMedicine } : {}),
    ...(detail
      ? {
          detail: {
            ...detail,
            ...(normalizedDetailMedicine && typeof normalizedDetailMedicine === "object"
              ? { medicine: normalizedDetailMedicine }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Maps a Zustand investigation row to AddInvestigationItemSerializer input.
 * Slugs and free-text ids use `source: custom`; catalog UUIDs set `catalog_item_id`.
 */
export function mapInvestigationRowForEndConsultation(
  inv: Record<string, unknown>,
  encounterId: string | null
): Record<string, unknown> {
  const normalized = normalizeItem(inv);
  const detail =
    inv?.detail && typeof inv.detail === "object"
      ? (inv.detail as Record<string, unknown>)
      : {};
  const serviceId = String(detail.service_id ?? "").trim();
  const name = String(inv.label ?? inv.name ?? "").trim();
  const rawUrgency = detail.urgency ?? "routine";
  const urgency =
    rawUrgency === "urgent" || rawUrgency === "stat" ? rawUrgency : "routine";
  const recommendationSource =
    detail.recommendation_source === "diagnosis_map" ||
    detail.recommendation_source === "bundle"
      ? detail.recommendation_source
      : "manual";

  const base: Record<string, unknown> = {
    name,
    is_complete: evaluateSectionItemComplete("investigations", normalized),
    price_snapshot: detail.price_snapshot ?? null,
    recommendation_source: recommendationSource,
    urgency,
    priority: urgency,
    instructions: Array.isArray(detail.instructions) ? detail.instructions : [],
    notes: String(detail.notes ?? ""),
    ...(recommendationSource === "diagnosis_map" && detail.diagnosis_id
      ? { diagnosis_id: String(detail.diagnosis_id) }
      : {}),
    ...(encounterId ? { encounter_id: encounterId } : {}),
  };

  const invType = detail.custom_investigation_type ?? detail.type;
  if (invType) {
    base.investigation_type = invType;
    base.type = invType;
  }

  const customPrefix = serviceId.toLowerCase().match(/^custom-(.+)$/);
  if (customPrefix) {
    const rest = customPrefix[1].trim();
    return {
      ...base,
      source: "custom",
      is_custom: true,
      service_id: serviceId,
      ...(isInvestigationServiceUuid(rest) ? { custom_investigation_id: rest } : {}),
    };
  }

  const bundleId = detail.bundle_id ? String(detail.bundle_id).trim() : "";
  if (bundleId && isInvestigationServiceUuid(bundleId) && !isInvestigationServiceUuid(serviceId)) {
    return {
      ...base,
      source: "package",
      bundle_id: bundleId,
      diagnostic_package_id: bundleId,
      is_custom: false,
    };
  }

  if (!isInvestigationServiceUuid(serviceId)) {
    return {
      ...base,
      source: "custom",
      is_custom: true,
      service_id: serviceId || name,
    };
  }

  if (shouldShowInvestigationCustomTag(normalized)) {
    return {
      ...base,
      source: "custom",
      is_custom: true,
      service_id: serviceId,
    };
  }

  return {
    ...base,
    source: "catalog",
    is_custom: false,
    service_id: serviceId,
    catalog_item_id: serviceId,
    ...(bundleId ? { bundle_id: bundleId } : {}),
  };
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
    const rawDetail = s?.detail;
    const schema = store.getSymptomSchemaForLabel(s.name);
    const detail =
      rawDetail && typeof rawDetail === "object"
        ? prunePayload(
            rawDetail as Record<string, unknown>,
            schema as unknown as TemplateItemSchema,
            store.symptomsSchema?.meta ?? null
          )
        : rawDetail;
    return {
      id: normalized.id,
      name: normalized.name,
      is_custom: normalized.is_custom,
      is_complete: evaluateSectionItemComplete("symptoms", normalized),
      meta: normalized.meta,
      detail,
    };
  });

  const medicinesFromSection = store.sectionItems["medicines"];
  const medicines = (
    Array.isArray(medicinesFromSection) && medicinesFromSection.length > 0
      ? medicinesFromSection
      : store.medicines ?? []
  ).map((m: any) => {
    const normalized = normalizeItem(m);
    const medicineWithApiAliases = normalizeMedicineRowForApi(
      m && typeof m === "object" ? (m as Record<string, unknown>) : {}
    );
    return {
      ...medicineWithApiAliases,
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
  const investigations = investigationsRaw.map((inv: Record<string, unknown>) =>
    mapInvestigationRowForEndConsultation(inv, store.encounterId)
  );

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
        findings: draftFindingsToEndConsultationPayload(store.draftFindings ?? [], {
          resolveSchema: (label) =>
            store.getFindingSchemaForLabel(label) as TemplateItemSchema | undefined,
          meta: store.findingsSchema?.meta ?? null,
        }),
        diagnosis: sectionItemsToEndConsultationDiagnosisPayload(
          store.sectionItems["diagnosis"] ?? []
        ),
        medicines,
        investigations,
        instructions,
      },
      /** Right-menu vitals (camelCase); used by summary-lite HTML preview before preconsult is persisted. */
      vitals: store.vitals ?? {},
      /** Free text; backend normalizes (trim). Always sent so replace-set can clear rows. */
      procedures: store.procedures ?? "",
      meta,
    },
  };
}
