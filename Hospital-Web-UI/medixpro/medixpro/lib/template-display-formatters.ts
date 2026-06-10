import { format, parseISO, isValid } from "date-fns";

export interface ParsedFollowUp {
  date?: string;
  interval?: number;
  unit?: string;
  reason?: string;
  early_if_persist?: boolean;
}

export interface FollowUpDisplay {
  primary: string;
  details: { label: string; value: string }[];
}

export interface TemplateRowDisplay {
  title: string;
  subtitle?: string;
  tags?: string[];
}

function parseLocalDate(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    const [y, m, d] = parts;
    const local = new Date(y, m - 1, d);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const parsed = parseISO(trimmed);
  return isValid(parsed) ? parsed : null;
}

/** Parse follow_up stored as JSON string or object. */
export function parseFollowUpRaw(raw: unknown): ParsedFollowUp | null {
  if (raw == null) return null;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ParsedFollowUp;
  }

  const str = String(raw).trim();
  if (!str) return null;

  try {
    const parsed = JSON.parse(str) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ParsedFollowUp;
    }
  } catch {
    return { reason: str };
  }

  return { reason: str };
}

export function hasFollowUpDisplayContent(raw: unknown): boolean {
  const parsed = parseFollowUpRaw(raw);
  if (!parsed) return false;
  if (parsed.date?.trim()) return true;
  if ((Number(parsed.interval) || 0) > 0) return true;
  if (parsed.reason?.trim()) return true;
  if (parsed.early_if_persist) return true;
  return false;
}

export function formatFollowUpForDisplay(raw: unknown): FollowUpDisplay | null {
  const parsed = parseFollowUpRaw(raw);
  if (!parsed || !hasFollowUpDisplayContent(raw)) return null;

  const details: { label: string; value: string }[] = [];
  let primary = "As advised";

  const dateStr = parsed.date?.trim();
  if (dateStr) {
    const date = parseLocalDate(dateStr);
    primary = date
      ? `Follow-up on ${format(date, "d MMM yyyy")}`
      : `Follow-up on ${dateStr}`;
  } else {
    const interval = Number(parsed.interval) || 0;
    if (interval > 0) {
      const unitRaw = String(parsed.unit ?? "days").toLowerCase();
      const isWeeks = unitRaw === "week" || unitRaw === "weeks";
      const unitLabel = isWeeks ? "week" : "day";
      primary = `Follow-up in ${interval} ${unitLabel}${interval === 1 ? "" : "s"}`;
    }
  }

  if (parsed.reason?.trim()) {
    details.push({ label: "Reason", value: parsed.reason.trim() });
  }

  if (parsed.early_if_persist) {
    details.push({ label: "Note", value: "Return early if symptoms persist" });
  }

  return { primary, details };
}

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === "object" && !Array.isArray(row)
    ? (row as Record<string, unknown>)
    : {};
}

function nestedRecord(row: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function formatDiagnosisRow(row: unknown, fallback: string): TemplateRowDisplay {
  const r = asRecord(row);
  const title = String(
    r.diagnosis_label ?? r.label ?? r.name ?? r.custom_name ?? fallback
  ).trim();

  const tags: string[] = [];
  if (r.is_primary === true) tags.push("Primary");
  const severity = String(r.severity ?? "").trim();
  if (severity) tags.push(severity.charAt(0).toUpperCase() + severity.slice(1));
  const icd = String(r.diagnosis_icd_code ?? r.icd_code ?? "").trim();
  if (icd) tags.push(`ICD ${icd}`);

  const notes = String(r.doctor_note ?? r.notes ?? "").trim();
  const status = String(r.diagnosis_type ?? r.status ?? "").trim();

  const subtitleParts = [status, notes].filter(Boolean);

  return {
    title: title || fallback,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
}

export function formatMedicineRow(row: unknown, fallback: string): TemplateRowDisplay {
  const r = asRecord(row);
  const detail = nestedRecord(r, "detail");
  const med = { ...r, ...nestedRecord(detail, "medicine") };

  const title = String(r.label ?? r.name ?? med.name ?? fallback).trim() || fallback;

  const dose = String(
    med.dose_display ?? med.dosage ?? med.dose ?? r.dosage ?? ""
  ).trim();
  const frequency = String(
    med.frequency_custom_text ?? med.frequency ?? med.frequency_id ?? r.frequency ?? ""
  ).trim();
  const duration = String(med.duration_display ?? med.duration ?? r.duration ?? "").trim();
  const route = String(med.route ?? r.route ?? "").trim();
  const instructions = String(med.instructions ?? r.instructions ?? detail.instructions ?? "").trim();

  const subtitleParts = [dose, frequency, duration, route].filter(Boolean);
  const tags = instructions ? [instructions] : undefined;

  return {
    title,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    tags,
  };
}

export function formatInvestigationRow(row: unknown, fallback: string): TemplateRowDisplay {
  const r = asRecord(row);
  const detail = nestedRecord(r, "detail");

  const title = String(
    r.name ?? r.label ?? r.test_name ?? r.investigation_name ?? fallback
  ).trim();

  const urgencyRaw = String(r.urgency ?? detail.urgency ?? "").trim().toLowerCase();
  const tags: string[] = [];
  if (urgencyRaw && urgencyRaw !== "routine") {
    tags.push(urgencyRaw.charAt(0).toUpperCase() + urgencyRaw.slice(1));
  }

  const notes = String(r.notes ?? detail.notes ?? "").trim();
  const instructions = Array.isArray(r.instructions)
    ? r.instructions.map(String).filter(Boolean).join(", ")
    : Array.isArray(detail.instructions)
      ? detail.instructions.map(String).filter(Boolean).join(", ")
      : "";

  const subtitleParts = [notes, instructions].filter(Boolean);

  return {
    title: title || fallback,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
}

export function formatAdviceDisplay(raw: unknown): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  return text || null;
}
