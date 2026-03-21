import type {
  ConsultationSectionItem,
  DraftConsultationFinding,
  SectionItemDetail,
} from "@/lib/consultation-types";

function normalizeApiSeverity(
  v: unknown
): "mild" | "moderate" | "severe" | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (s === "mild" || s === "moderate" || s === "severe") return s;
  return null;
}

export type ConsultationFindingApiRow = {
  id: string;
  display_name: string;
  is_custom: boolean;
  finding_code?: string | null;
  severity?: string | null;
  note?: string | null;
  extension_data?: Record<string, unknown> | null;
};

export function consultationFindingRowToSectionItem(
  row: ConsultationFindingApiRow
): ConsultationSectionItem {
  const ext =
    row.extension_data && typeof row.extension_data === "object"
      ? { ...row.extension_data }
      : {};
  const detail: SectionItemDetail & Record<string, unknown> = {
    notes: row.note ?? "",
    ...ext,
  };
  const sev = normalizeApiSeverity(row.severity);
  if (sev) {
    detail.severity = sev;
  }
  return {
    id: row.id,
    label: row.display_name,
    isCustom: row.is_custom,
    findingKey: row.finding_code ?? undefined,
    detail,
  };
}

export function sectionItemsToEndConsultationFindingsPayload(
  items: ConsultationSectionItem[]
) {
  return items.map((item) => {
    const d = (item.detail ?? {}) as SectionItemDetail & Record<string, unknown>;
    const { notes, severity, duration, attributes, customTags, ...rest } = d;
    const restCopy = { ...rest } as Record<string, unknown>;
    let mergedSeverity: unknown = severity;
    if (mergedSeverity == null && restCopy.severity != null) {
      mergedSeverity = restCopy.severity;
      delete restCopy.severity;
    }
    const extension_data =
      Object.keys(restCopy).length > 0
        ? (Object.fromEntries(
            Object.entries(restCopy).filter(
              ([_, v]) =>
                v !== undefined &&
                v !== "" &&
                !(Array.isArray(v) && v.length === 0)
            )
          ) as Record<string, unknown>)
        : null;
    return {
      id: item.id,
      display_name: item.label,
      is_custom: item.isCustom === true,
      finding_code: item.findingKey ?? null,
      severity: normalizeApiSeverity(mergedSeverity),
      note: typeof notes === "string" ? notes : "",
      extension_data,
    };
  });
}

/** Build End Consultation `findings` array from draft state (excludes deleted). */
export function draftFindingsToEndConsultationPayload(
  drafts: DraftConsultationFinding[]
) {
  return drafts
    .filter((d) => !d.is_deleted)
    .map((d) => ({
      finding_id: d.is_custom ? null : (d.finding_id ?? null),
      finding_code: d.is_custom ? null : (d.finding_code ?? null),
      custom_name: d.is_custom ? (d.custom_name?.trim() || null) : null,
      is_custom: d.is_custom,
      severity: normalizeApiSeverity(d.severity),
      note: typeof d.note === "string" ? d.note : "",
      extension_data:
        d.extension_data && typeof d.extension_data === "object"
          ? d.extension_data
          : null,
    }));
}

/** Merge UI detail patch into draft fields (note, severity, extension_data). */
export function mergeDetailPatchIntoDraft(
  current: DraftConsultationFinding,
  patch: Partial<SectionItemDetail> & Record<string, unknown>
): Partial<DraftConsultationFinding> {
  const base: Record<string, unknown> = {
    notes: current.note ?? "",
    severity: current.severity,
    ...(current.extension_data ?? {}),
  };
  const merged = { ...base, ...patch };
  const {
    notes,
    severity,
    duration,
    attributes,
    customTags,
    ...extRest
  } = merged as Record<string, unknown>;
  const extension_data =
    Object.keys(extRest).length > 0
      ? (Object.fromEntries(
          Object.entries(extRest).filter(
            ([k, v]) =>
              k !== "notes" &&
              k !== "severity" &&
              v !== undefined &&
              v !== "" &&
              !(Array.isArray(v) && v.length === 0)
          )
        ) as Record<string, unknown>)
      : null;
  return {
    note: typeof notes === "string" ? notes : current.note,
    severity: normalizeApiSeverity(severity) ?? current.severity ?? null,
    extension_data:
      extension_data && Object.keys(extension_data).length > 0
        ? extension_data
        : null,
  };
}

export function detailToFindingPatch(detail: SectionItemDetail & Record<string, unknown>) {
  const { notes, severity, duration, attributes, customTags, ...rest } = detail;
  const restCopy = { ...rest } as Record<string, unknown>;
  let mergedSeverity: unknown = severity;
  if (mergedSeverity == null && restCopy.severity != null) {
    mergedSeverity = restCopy.severity;
    delete restCopy.severity;
  }
  const extension_data =
    Object.keys(restCopy).length > 0
      ? (Object.fromEntries(
          Object.entries(restCopy).filter(
            ([_, v]) =>
              v !== undefined &&
              v !== "" &&
              !(Array.isArray(v) && v.length === 0)
          )
        ) as Record<string, unknown>)
      : null;
  return {
    note: typeof notes === "string" ? notes : "",
    severity: normalizeApiSeverity(mergedSeverity),
    extension_data,
  };
}
