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

export function evaluateSectionItemComplete(
  section: ConsultationSectionType,
  item: ConsultationSectionItem
): boolean {
  if (section === "symptoms") return isSymptomComplete(item);
  if (section === "findings") return isFindingComplete(item);
  if (section === "diagnosis") return isDiagnosisComplete(item);
  if (section === "medicines") return isMedicineComplete(item);
  return !!itemName(item);
}

export function getSectionCompletionHints(
  section: ConsultationSectionType,
  item: ConsultationSectionItem
): string[] {
  const normalized = normalizeItem(item);
  if (section === "symptoms") {
    const hints: string[] = [];
    if (!normalized.name) hints.push("Add symptom name");
    const hasDetail = Object.values(normalized.meta).some((v) => hasMeaningfulValue(v));
    if (!hasDetail) hints.push("Add at least one detail (notes, severity, duration)");
    return hints;
  }
  if (section === "findings") {
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
  return [];
}

