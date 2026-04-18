import { buildEndConsultationPayload } from "@/lib/consultation-payload-builder";

export type EndConsultationPayload = ReturnType<typeof buildEndConsultationPayload>;

/** Serializable subset stored as ClinicalTemplate.template_data (no patient/encounter/vitals/symptoms). */
export interface ClinicalTemplateData {
  diagnosis: unknown[];
  medicines: unknown[];
  investigations: Record<string, unknown>[];
  advice: string;
  follow_up: string;
}

function stripEncounterIdsFromInvestigations(
  rows: unknown[]
): Record<string, unknown>[] {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (!row || typeof row !== "object") return {};
    const copy = { ...(row as Record<string, unknown>) };
    delete copy.encounter_id;
    return copy;
  });
}

function followUpToString(meta: Record<string, unknown> | undefined): string {
  const fu = meta?.follow_up;
  if (fu == null) return "";
  if (typeof fu === "string") return fu;
  if (typeof fu === "object") return JSON.stringify(fu);
  return String(fu);
}

/**
 * Maps the same payload shape as end consultation into a compact template blob.
 * Omits symptoms, vitals, encounter-scoped ids where noted.
 */
export function cleanTemplatePayload(payload: EndConsultationPayload): ClinicalTemplateData {
  const section = payload.store.sectionItems;
  return {
    diagnosis: Array.isArray(section.diagnosis) ? [...section.diagnosis] : [],
    medicines: Array.isArray(section.medicines) ? [...section.medicines] : [],
    investigations: stripEncounterIdsFromInvestigations(
      Array.isArray(section.investigations) ? section.investigations : []
    ),
    advice: String(payload.store.procedures ?? "").trim(),
    follow_up: followUpToString(payload.store.meta as Record<string, unknown>),
  };
}

/** True if there is at least one non-empty clinical field worth saving. */
export function hasTemplateClinicalContent(data: ClinicalTemplateData): boolean {
  const hasItems =
    data.diagnosis.length > 0 ||
    data.medicines.length > 0 ||
    data.investigations.length > 0;
  const hasText =
    data.advice.length > 0 || data.follow_up.length > 0;
  return hasItems || hasText;
}
