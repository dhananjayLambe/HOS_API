import type {
  ConsultationSectionItem,
  ConsultationSectionType,
  MedicinePrescriptionDetail,
} from "@/lib/consultation-types";
import { getMedicineCompletionStatus } from "@/lib/medicine-prescription-utils";

export type NormalizedSectionItem = ConsultationSectionItem & {
  name: string;
  is_custom: boolean;
  is_complete: boolean;
  meta: Record<string, unknown>;
};

export type SchemaFieldRequirement = {
  key: string;
  label?: string;
  required?: boolean;
};

export type SectionSchemaRequirementOptions = {
  fields?: SchemaFieldRequirement[];
  no_hard_required?: boolean;
};

function itemName(item: ConsultationSectionItem): string {
  return String(item.name ?? item.label ?? "").trim();
}

function itemMeta(item: ConsultationSectionItem): Record<string, unknown> {
  const detail = item.detail;
  if (detail && typeof detail === "object") {
    return detail as Record<string, unknown>;
  }
  return {};
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function hasRequiredFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function getRequiredSchemaFields(
  options?: SectionSchemaRequirementOptions
): SchemaFieldRequirement[] {
  if (!options || options.no_hard_required) return [];
  const fields = Array.isArray(options.fields) ? options.fields : [];
  return fields.filter((field) => field.required === true);
}

function getMissingRequiredFields(
  normalized: NormalizedSectionItem,
  options?: SectionSchemaRequirementOptions
): SchemaFieldRequirement[] {
  const requiredFields = getRequiredSchemaFields(options);
  if (requiredFields.length === 0) return [];
  return requiredFields.filter((field) => !hasRequiredFieldValue(normalized.meta[field.key]));
}

export function normalizeItem(item: ConsultationSectionItem): NormalizedSectionItem {
  const name = itemName(item);
  const is_custom = Boolean(item.is_custom ?? item.isCustom ?? false);
  const is_complete = Boolean(item.is_complete ?? false);
  return {
    ...item,
    name,
    label: item.label ?? name,
    is_custom,
    is_complete,
    meta: itemMeta(item),
  };
}

export function isSymptomComplete(item: ConsultationSectionItem): boolean {
  const normalized = normalizeItem(item);
  const { meta } = normalized;
  const hasDetail = Object.values(meta).some((v) => hasMeaningfulValue(v));
  return !!normalized.name && hasDetail;
}

export function isFindingComplete(item: ConsultationSectionItem): boolean {
  const normalized = normalizeItem(item);
  const hasValue = hasMeaningfulValue(normalized.meta.value);
  const hasObservation = hasMeaningfulValue(normalized.meta.notes ?? normalized.meta.note);
  const hasOtherDetail = Object.entries(normalized.meta)
    .filter(([k]) => k !== "value" && k !== "notes" && k !== "note")
    .some(([, v]) => hasMeaningfulValue(v));
  return !!normalized.name && (hasValue || hasObservation || hasOtherDetail);
}

export function isDiagnosisComplete(item: ConsultationSectionItem): boolean {
  const normalized = normalizeItem(item);
  const hasMasterCode = Boolean(item.diagnosisKey || item.diagnosisIcdCode);
  const hasDetail = Object.values(normalized.meta).some((v) => hasMeaningfulValue(v));
  return !!normalized.name && (hasMasterCode || hasDetail);
}

export function isMedicineComplete(item: ConsultationSectionItem): boolean {
  const med = (item.detail?.medicine ?? {}) as MedicinePrescriptionDetail;
  return getMedicineCompletionStatus(med).level === "complete";
}

/** Investigation "complete" when any clinical detail is set beyond defaults (routine + empty). */
/**
 * CUSTOM chip/badge only for true user-defined rows (sheet or free-text slug),
 * never for catalog UUID tests — even if `is_custom` was mis-set before `fromCatalogUi`.
 */
export function shouldShowInvestigationCustomTag(item: ConsultationSectionItem): boolean {
  const d = item.detail ?? {};
  const sid = String(d.service_id ?? "");
  if (sid.startsWith("custom-")) return true;
  if (d.investigation_category === "Custom") return true;
  if (!(item.is_custom ?? item.isCustom)) return false;
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid);
  if (looksLikeUuid) return false;
  return true;
}

export function isInvestigationComplete(item: ConsultationSectionItem): boolean {
  const normalized = normalizeItem(item);
  if (!normalized.name) return false;
  const d = item.detail ?? {};
  const instructions = Array.isArray(d.instructions) ? d.instructions : [];
  const notes = typeof d.notes === "string" ? d.notes.trim() : "";
  const urgency = d.urgency ?? "routine";
  const hasNonRoutineUrgency = urgency === "urgent" || urgency === "stat";
  return instructions.length > 0 || notes.length > 0 || hasNonRoutineUrgency;
}

export function evaluateSectionItemComplete(
  section: ConsultationSectionType,
  item: ConsultationSectionItem
): boolean {
  return evaluateSectionItemCompleteWithSchema(section, item);
}

export function evaluateSectionItemCompleteWithSchema(
  section: ConsultationSectionType,
  item: ConsultationSectionItem,
  options?: SectionSchemaRequirementOptions
): boolean {
  const normalized = normalizeItem(item);
  if (!normalized.name) return false;

  const missingRequiredFields = getMissingRequiredFields(normalized, options);
  if (missingRequiredFields.length > 0) return false;

  if (section === "symptoms" || section === "findings" || section === "diagnosis") {
    const hasHardRequirements = getRequiredSchemaFields(options).length > 0;
    if (!hasHardRequirements) {
      // Optional-only schema rows are complete as soon as the item is selected/added.
      return true;
    }
  }

  if (section === "symptoms") return isSymptomComplete(item);
  if (section === "findings") return isFindingComplete(item);
  if (section === "diagnosis") return isDiagnosisComplete(item);
  if (section === "medicines") return isMedicineComplete(item);
  if (section === "investigations") return isInvestigationComplete(item);
  return true;
}

export function getSectionCompletionHints(
  section: ConsultationSectionType,
  item: ConsultationSectionItem,
  options?: SectionSchemaRequirementOptions
): string[] {
  const normalized = normalizeItem(item);
  const missingRequiredFields = getMissingRequiredFields(normalized, options);
  if (missingRequiredFields.length > 0) {
    const labels = missingRequiredFields.map((field) => field.label ?? field.key);
    return [`Fill required fields: ${labels.join(", ")}`];
  }

  if (section === "symptoms") {
    const hasHardRequirements = getRequiredSchemaFields(options).length > 0;
    if (!hasHardRequirements) return [];
    const hints: string[] = [];
    if (!normalized.name) hints.push("Add symptom name");
    const hasDetail = Object.values(normalized.meta).some((v) => hasMeaningfulValue(v));
    if (!hasDetail) hints.push("Add at least one detail (notes, severity, duration)");
    return hints;
  }
  if (section === "findings") {
    const hasHardRequirements = getRequiredSchemaFields(options).length > 0;
    if (!hasHardRequirements) return [];
    const hints: string[] = [];
    if (!normalized.name) hints.push("Add finding name");
    const hasValue = hasMeaningfulValue(normalized.meta.value);
    const hasObservation = hasMeaningfulValue(normalized.meta.notes ?? normalized.meta.note);
    const hasOtherDetail = Object.entries(normalized.meta)
      .filter(([k]) => k !== "value" && k !== "notes" && k !== "note")
      .some(([, v]) => hasMeaningfulValue(v));
    if (!(hasValue || hasObservation || hasOtherDetail)) {
      hints.push("Add value or observation");
    }
    return hints;
  }
  if (section === "diagnosis") {
    const hasHardRequirements = getRequiredSchemaFields(options).length > 0;
    if (!hasHardRequirements) return [];
    const hints: string[] = [];
    if (!normalized.name) hints.push("Add diagnosis name");
    const hasMasterCode = Boolean(item.diagnosisKey || item.diagnosisIcdCode);
    const hasDetail = Object.values(normalized.meta).some((v) => hasMeaningfulValue(v));
    if (!(hasMasterCode || hasDetail)) hints.push("Add ICD/master diagnosis or clinical detail");
    return hints;
  }
  if (section === "medicines") {
    return ["Fill dose, frequency, and duration"];
  }
  if (section === "investigations") {
    if (isInvestigationComplete(item)) return [];
    return ["Add instruction chips or notes, or set priority to Urgent/STAT"];
  }
  return [];
}

