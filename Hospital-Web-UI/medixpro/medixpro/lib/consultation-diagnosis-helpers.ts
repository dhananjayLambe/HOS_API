import type { ConsultationSectionItem, SectionItemDetail } from "@/lib/consultation-types";

type DiagnosisDetail = SectionItemDetail & {
  status?: "provisional" | "confirmed";
  primary?: boolean;
  chronic?: boolean;
};

function normalizeSeverity(v: unknown): "mild" | "moderate" | "severe" | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (s === "mild" || s === "moderate" || s === "severe") return s;
  return null;
}

function normalizeDiagnosisType(v: unknown): "provisional" | "confirmed" {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "confirmed" ? "confirmed" : "provisional";
}

export function sectionItemsToEndConsultationDiagnosisPayload(
  items: ConsultationSectionItem[]
) {
  return items.map((item) => {
    const detail = (item.detail ?? {}) as DiagnosisDetail;
    return {
      is_custom: item.isCustom === true,
      diagnosis_key: item.isCustom ? null : (item.diagnosisKey ?? null),
      diagnosis_icd_code: item.isCustom ? null : (item.diagnosisIcdCode ?? null),
      diagnosis_label: item.label,
      custom_name: item.isCustom ? item.label : null,
      custom_diagnosis_id: item.isCustom ? (item.customDiagnosisId ?? null) : null,
      is_primary: detail.primary === true,
      diagnosis_type: normalizeDiagnosisType(detail.status),
      severity: normalizeSeverity(detail.severity),
      doctor_note: typeof detail.notes === "string" ? detail.notes : "",
      is_chronic: detail.chronic === true,
    };
  });
}
