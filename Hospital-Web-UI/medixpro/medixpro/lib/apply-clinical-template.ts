import { hasTemplateClinicalContent, type ClinicalTemplateData } from "@/lib/clean-template-payload";
import { evaluateSectionItemComplete } from "@/lib/consultation-completion";
import type { ConsultationSectionItem, SectionItemDetail } from "@/lib/consultation-types";
import type { ClinicalTemplateListItem } from "@/services/clinical-template.service";
import { useConsultationStore } from "@/store/consultationStore";

/** Snapshot getter for tests; defaults to the live Zustand store. */
export type ConsultationStoreGetter = typeof useConsultationStore.getState;

function templateDataToClinicalShape(td: Record<string, unknown>): ClinicalTemplateData {
  return {
    diagnosis: Array.isArray(td.diagnosis) ? td.diagnosis : [],
    medicines: Array.isArray(td.medicines) ? td.medicines : [],
    investigations: (Array.isArray(td.investigations) ? td.investigations : []) as ClinicalTemplateData["investigations"],
    advice: String(td.advice ?? "").trim(),
    follow_up:
      typeof td.follow_up === "string"
        ? td.follow_up
        : td.follow_up != null
          ? JSON.stringify(td.follow_up)
          : "",
  };
}

export interface ApplyClinicalTemplateResult {
  applied: boolean;
  typeMismatch: boolean;
  error?: string;
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** End-consultation diagnosis payload row → section item. */
function diagnosisPayloadToSectionItem(row: Record<string, unknown>): ConsultationSectionItem {
  const id = typeof row.id === "string" && row.id ? row.id : newId("dx");
  const label = String(
    row.diagnosis_label ?? row.custom_name ?? row.name ?? ""
  ).trim() || "Diagnosis";
  const isCustom = Boolean(row.is_custom);
  return {
    id,
    label,
    name: String(row.name ?? label),
    is_custom: isCustom,
    isCustom: isCustom,
    diagnosisKey: row.diagnosis_key != null ? String(row.diagnosis_key) : undefined,
    diagnosisIcdCode: row.diagnosis_icd_code != null ? String(row.diagnosis_icd_code) : undefined,
    customDiagnosisId: row.custom_diagnosis_id != null ? String(row.custom_diagnosis_id) : undefined,
    detail: {
      primary: row.is_primary === true,
      status: row.diagnosis_type === "confirmed" ? "confirmed" : "provisional",
      severity:
        row.severity === "mild" || row.severity === "moderate" || row.severity === "severe"
          ? row.severity
          : undefined,
      notes: String(row.doctor_note ?? ""),
      chronic: row.is_chronic === true,
    },
    is_complete: false,
  };
}

function normalizeMedicineRow(row: unknown): ConsultationSectionItem | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id ? r.id : newId("rx");
  const label = String(r.label ?? r.name ?? "").trim() || "Medicine";
  const name = String(r.name ?? label);
  const item: ConsultationSectionItem = {
    ...r,
    id,
    label,
    name,
    is_custom: Boolean(r.is_custom ?? r.isCustom),
    isCustom: Boolean(r.is_custom ?? r.isCustom),
    detail: (r.detail && typeof r.detail === "object" ? r.detail : {}) as ConsultationSectionItem["detail"],
    is_complete: false,
  };
  item.is_complete = evaluateSectionItemComplete("medicines", item);
  return item;
}

function investigationPayloadRowToSectionItem(
  row: Record<string, unknown>,
  encounterId: string | null
): ConsultationSectionItem {
  const id = typeof row.id === "string" && row.id.startsWith("inv-") ? row.id : newId("inv");
  const name = String(row.name ?? "").trim() || "Investigation";
  const detail: SectionItemDetail = {
    service_id: String(row.service_id ?? ""),
    recommendation_source:
      row.recommendation_source === "diagnosis_map" || row.recommendation_source === "bundle"
        ? row.recommendation_source
        : "manual",
    urgency:
      row.urgency === "urgent" || row.urgency === "stat" ? row.urgency : "routine",
    instructions: Array.isArray(row.instructions) ? (row.instructions as string[]) : [],
    notes: String(row.notes ?? ""),
    price_snapshot: (row.price_snapshot as number | null | undefined) ?? null,
    bundle_id: row.bundle_id != null ? String(row.bundle_id) : undefined,
    diagnosis_id: row.diagnosis_id != null ? String(row.diagnosis_id) : undefined,
    custom_investigation_type: row.type as SectionItemDetail["custom_investigation_type"],
  };
  if (encounterId) {
    (detail as Record<string, unknown>).encounter_id = encounterId;
  }
  const item: ConsultationSectionItem = {
    id,
    label: name,
    name,
    is_custom: Boolean(row.is_custom),
    detail,
    is_complete: false,
  };
  item.is_complete = evaluateSectionItemComplete("investigations", item);
  return item;
}

function parseFollowUpAndApply(
  followRaw: string | undefined,
  setFollowUp: ReturnType<ConsultationStoreGetter>["setFollowUp"]
): void {
  const raw = String(followRaw ?? "").trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const interval = Number(parsed.interval ?? 0) || 0;
      const unitRaw = String(parsed.unit ?? "days").toLowerCase();
      const follow_up_unit = unitRaw === "weeks" ? "weeks" : "days";
      setFollowUp({
        follow_up_date: typeof parsed.date === "string" ? parsed.date : "",
        follow_up_interval: interval,
        follow_up_unit,
        follow_up_reason: typeof parsed.reason === "string" ? parsed.reason : "",
        follow_up_early_if_persist: Boolean(parsed.early_if_persist),
      });
      return;
    }
  } catch {
    /* plain text */
  }
  setFollowUp({ follow_up_reason: raw });
}

/**
 * Replaces diagnosis, medicines, investigations, procedures (advice), and follow-up from a saved template.
 * @param getState - Optional; pass a mock from tests. Defaults to `useConsultationStore.getState`.
 */
export function applyClinicalTemplate(
  template: ClinicalTemplateListItem,
  getState: ConsultationStoreGetter = useConsultationStore.getState
): ApplyClinicalTemplateResult {
  const data = template.template_data;
  if (!data || typeof data !== "object") {
    return { applied: false, typeMismatch: false, error: "Template has no data" };
  }

  const td = data as Record<string, unknown>;
  if (!hasTemplateClinicalContent(templateDataToClinicalShape(td))) {
    return {
      applied: false,
      typeMismatch: false,
      error: "This template has no clinical content to apply",
    };
  }

  const get = getState;
  const currentType = get().consultationType;
  const typeMismatch =
    Boolean(template.consultation_type) && template.consultation_type !== currentType;

  try {
    const encounterId = get().encounterId;

    const diagnosisRows = Array.isArray(td.diagnosis) ? td.diagnosis : [];
    const diagnosisItems: ConsultationSectionItem[] = diagnosisRows
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object" && !Array.isArray(x))
      .map((row) => {
        if (
          typeof row.label === "string" &&
          row.label &&
          row.diagnosis_label === undefined &&
          row.diagnosis_icd_code === undefined
        ) {
          const item = { ...(row as unknown as ConsultationSectionItem) };
          item.is_complete = evaluateSectionItemComplete("diagnosis", item);
          return item;
        }
        const item = diagnosisPayloadToSectionItem(row);
        item.is_complete = evaluateSectionItemComplete("diagnosis", item);
        return item;
      });

    const medicineRows = Array.isArray(td.medicines) ? td.medicines : [];
    const medicineItems: ConsultationSectionItem[] = [];
    for (const row of medicineRows) {
      const m = normalizeMedicineRow(row);
      if (m) medicineItems.push(m);
    }

    const invRows = Array.isArray(td.investigations) ? td.investigations : [];
    const investigationItems: ConsultationSectionItem[] = invRows
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object" && !Array.isArray(x))
      .map((row) => investigationPayloadRowToSectionItem(row, encounterId));

    get().replaceSectionItems("diagnosis", diagnosisItems);
    get().replaceSectionItems("medicines", medicineItems);
    get().replaceSectionItems("investigations", investigationItems);

    const advice = String(td.advice ?? "").trim();
    get().setProcedures(advice);

    parseFollowUpAndApply(
      typeof td.follow_up === "string" ? td.follow_up : "",
      get().setFollowUp
    );

    return { applied: true, typeMismatch };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to apply template";
    return { applied: false, typeMismatch: false, error: message };
  }
}
