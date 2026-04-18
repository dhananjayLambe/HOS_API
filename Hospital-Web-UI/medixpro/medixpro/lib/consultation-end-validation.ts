/**
 * Client-side validation before POST .../consultation/complete/.
 * Rules align with workflow type (FULL / QUICK_RX / TEST_ONLY).
 */

import type { ConsultationWorkflowType } from "@/lib/consultation-types";
import type { ConsultationVitals } from "@/lib/consultation-types";
import type { MainSectionId } from "@/lib/consultation-workflow";
import { useConsultationStore } from "@/store/consultationStore";

/** Keys that can show hard blockers; vitals is soft-warning only via `warnings`. */
export type EndConsultationSectionErrorKey = MainSectionId;

export const END_CONSULTATION_VALIDATION_ORDER: EndConsultationSectionErrorKey[] = [
  "symptoms",
  "findings",
  "diagnosis",
  "medicines",
  "investigations",
  "procedure",
  "follow_up",
  "instructions",
];

export const SECTION_END_ERROR_LABEL: Record<EndConsultationSectionErrorKey, string> = {
  symptoms: "Symptoms",
  findings: "Findings",
  diagnosis: "Diagnosis",
  medicines: "Medicines",
  investigations: "Investigations",
  instructions: "Instructions",
  follow_up: "Follow-up",
  procedure: "Procedures",
};

export type EndConsultationValidationResult = {
  errors: Partial<Record<EndConsultationSectionErrorKey, string>>;
  /** Non-blocking (e.g. vitals recommended). */
  warnings: { vitals?: string };
};

function getSymptomsList(store: ReturnType<typeof useConsultationStore.getState>) {
  const fromSection = store.sectionItems["symptoms"];
  if (Array.isArray(fromSection) && fromSection.length > 0) return fromSection;
  return store.symptoms ?? [];
}

function getMedicinesList(store: ReturnType<typeof useConsultationStore.getState>) {
  const fromSection = store.sectionItems["medicines"];
  if (Array.isArray(fromSection) && fromSection.length > 0) return fromSection;
  return store.medicines ?? [];
}

function getInvestigationsList(store: ReturnType<typeof useConsultationStore.getState>) {
  return store.sectionItems["investigations"] ?? [];
}

/**
 * Validates each medicine row in the end-consultation payload shape.
 * Returns first error message or null if all rows valid (or empty array).
 */
export function validateMedicineLinesInPayload(payload: {
  store?: { sectionItems?: { medicines?: unknown[] } };
}): string | null {
  const medicines = payload?.store?.sectionItems?.medicines;
  if (!Array.isArray(medicines) || medicines.length === 0) return null;

  for (let index = 0; index < medicines.length; index += 1) {
    const item = medicines[index];
    const itemRec = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const detail = itemRec?.detail;
    const med =
      detail && typeof detail === "object"
        ? ((detail as Record<string, unknown>).medicine as unknown) ?? item
        : item;
    if (!med || typeof med !== "object") continue;

    const name = String(
      (med as Record<string, unknown>).name ?? itemRec?.label ?? `Medicine ${index + 1}`
    ).trim();
    const doseValue = (med as Record<string, unknown>).dose_value;
    const doseUnitId = String((med as Record<string, unknown>).dose_unit_id ?? "").trim();
    const routeId = String((med as Record<string, unknown>).route_id ?? "").trim();
    const frequencyId = String((med as Record<string, unknown>).frequency_id ?? "").trim();
    const durationValue = (med as Record<string, unknown>).duration_value;
    const durationSpecial = String((med as Record<string, unknown>).duration_special ?? "").trim();
    const durationUnit = String((med as Record<string, unknown>).duration_unit ?? "").trim();

    if (doseValue === undefined || doseValue === null || doseValue === "" || Number(doseValue) <= 0) {
      return `${name}: dose is required`;
    }
    if (!doseUnitId) {
      return `${name}: dose unit is required`;
    }
    if (!routeId) {
      return `${name}: route is required`;
    }
    if (!frequencyId) {
      return `${name}: frequency is required`;
    }
    const hasDurationValue =
      durationValue !== undefined && durationValue !== null && durationValue !== "";
    const hasDurationSpecial = Boolean(durationSpecial);
    if (!hasDurationValue && !hasDurationSpecial) {
      return `${name}: duration is required`;
    }
    if (hasDurationValue && !durationUnit) {
      return `${name}: duration unit is required`;
    }
  }

  return null;
}

function vitalsSoftWarning(
  type: ConsultationWorkflowType,
  vitals: ConsultationVitals,
  vitalsLoaded: boolean
): string | undefined {
  if (type === "TEST_ONLY") return undefined;
  if (!vitalsLoaded) return undefined;

  const allEmpty =
    (!vitals.weightKg || vitals.weightKg === "") &&
    (!vitals.heightCm || vitals.heightCm === "") &&
    (!vitals.bmi || vitals.bmi === "") &&
    (!vitals.temperatureF || vitals.temperatureF === "");

  if (allEmpty) {
    return "Vitals not recorded — add weight, height, or temperature if available.";
  }

  const missingForBmi =
    !vitals.bmi && (vitals.heightCm || vitals.weightKg)
      ? !vitals.heightCm
        ? "height"
        : !vitals.weightKg
          ? "weight"
          : null
      : null;

  if (missingForBmi) {
    return `Add ${missingForBmi} to compute BMI.`;
  }

  return undefined;
}

/**
 * Run type-aware validation using the same store shape as `buildEndConsultationPayload`.
 * Pass the built payload so medicine line checks match the API.
 */
/** Minimal payload shape for medicine-line checks (same as `buildEndConsultationPayload` output). */
export type EndConsultationPayloadLike = {
  store?: { sectionItems?: { medicines?: unknown[] } };
};

export function validateConsultationForEnd(
  store: ReturnType<typeof useConsultationStore.getState>,
  payload: EndConsultationPayloadLike,
  consultationType: ConsultationWorkflowType
): EndConsultationValidationResult {
  const errors: Partial<Record<EndConsultationSectionErrorKey, string>> = {};
  const warnings: { vitals?: string } = {};

  const symptoms = getSymptomsList(store);
  const diagnosis = store.sectionItems["diagnosis"] ?? [];
  const medicines = getMedicinesList(store);
  const investigations = getInvestigationsList(store);

  const medLineError = validateMedicineLinesInPayload(payload);

  switch (consultationType) {
    case "FULL": {
      if (symptoms.length === 0) {
        errors.symptoms = "At least one symptom is required.";
      }
      if (diagnosis.length === 0) {
        errors.diagnosis = "At least one diagnosis is required.";
      }
      if (medicines.length === 0) {
        errors.medicines = "Add at least one medicine.";
      } else if (medLineError) {
        errors.medicines = medLineError;
      }
      break;
    }
    case "QUICK_RX": {
      if (medicines.length === 0) {
        errors.medicines = "Add at least one medicine.";
      } else if (medLineError) {
        errors.medicines = medLineError;
      }
      break;
    }
    case "TEST_ONLY": {
      if (investigations.length === 0) {
        errors.investigations = "Add at least one investigation or test.";
      }
      break;
    }
    default:
      break;
  }

  const vw = vitalsSoftWarning(consultationType, store.vitals ?? {}, store.vitalsLoaded);
  if (vw) warnings.vitals = vw;

  return { errors, warnings };
}

export function getFirstSectionErrorKey(
  errors: Partial<Record<EndConsultationSectionErrorKey, string>>
): EndConsultationSectionErrorKey | undefined {
  for (const key of END_CONSULTATION_VALIDATION_ORDER) {
    if (errors[key]) return key;
  }
  return undefined;
}

export function formatEndConsultationErrorToast(
  errors: Partial<Record<EndConsultationSectionErrorKey, string>>
): string {
  const keys = END_CONSULTATION_VALIDATION_ORDER.filter((k) => errors[k]);
  if (keys.length === 0) return "";
  const labels = keys.map((k) => SECTION_END_ERROR_LABEL[k]);
  return `Please complete required sections: ${labels.join(", ")}`;
}
