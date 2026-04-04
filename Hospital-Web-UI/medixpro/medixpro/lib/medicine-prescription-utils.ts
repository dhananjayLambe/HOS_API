import type {
  ConsultationSectionItem,
  MedicineDurationSpecial,
  MedicinePrescriptionDetail,
  MedicineTiming,
} from "@/lib/consultation-types";

/**
 * Quick-select presets per dose unit (tap-first; custom input always available).
 * Unknown / legacy ids fall back to tablet presets.
 */
const DOSE_PRESETS_BY_UNIT: Record<string, number[]> = {
  /** Tablet: common fractions + whole/half steps (single-line scroll row in the panel). */
  tablet: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3],
  capsule: [0.5, 1, 1.5, 2, 3, 4],
  sachet: [1, 2],
  syrup: [2.5, 5, 10],
  ml: [2.5, 5, 10],
  drops: [1, 2, 5],
  injection: [1, 2],
  ampoule: [1, 2],
  vial: [1, 2],
  insulin: [5, 10, 20],
  /** Generic “units” (e.g. insulin syringe) — same grid as insulin */
  units: [5, 10, 20],
  cream: [1, 2, 3],
  ointment: [1, 2, 3],
  gel: [1, 2, 3],
  spray: [1, 2, 3],
  patch: [1, 2],
  suppository: [1, 2],
  inhaler: [1, 2, 4],
  nebulizer: [1, 2],
  powder: [0.5, 1, 1.5, 2],
  other: [1, 2],
};

export function getDosePresetChips(doseUnitId: string): number[] {
  const key = doseUnitId?.trim().toLowerCase() ?? "";
  return DOSE_PRESETS_BY_UNIT[key] ?? DOSE_PRESETS_BY_UNIT.tablet;
}

/** All dose form / unit options shown in the prescription UI (order: solids → liquids → injectables → topical → other). */
export const DOSE_UNIT_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "tablet", label: "Tablet" },
  { id: "capsule", label: "Capsule" },
  { id: "sachet", label: "Sachet" },
  { id: "syrup", label: "Syrup" },
  { id: "ml", label: "mL" },
  { id: "drops", label: "Drops" },
  { id: "injection", label: "Injection" },
  { id: "ampoule", label: "Ampoule" },
  { id: "vial", label: "Vial" },
  { id: "insulin", label: "Insulin" },
  { id: "units", label: "Units" },
  { id: "cream", label: "Cream" },
  { id: "ointment", label: "Ointment" },
  { id: "gel", label: "Gel" },
  { id: "spray", label: "Spray" },
  { id: "patch", label: "Patch" },
  { id: "suppository", label: "Suppository" },
  { id: "inhaler", label: "Inhaler (puff)" },
  { id: "nebulizer", label: "Nebulizer" },
  { id: "powder", label: "Powder" },
  { id: "other", label: "Other" },
] as const;

export function formatDoseDisplay(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "";
  }
  const n = Number(value);
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

/** After unit change: if current numeric dose is not in the new preset list, switch to custom text. */
export function patchMedicineAfterUnitChange(
  m: MedicinePrescriptionDetail,
  newUnitId: string
): Partial<MedicinePrescriptionDetail> {
  const presets = getDosePresetChips(newUnitId);
  const patch: Partial<MedicinePrescriptionDetail> = { dose_unit_id: newUnitId };
  if (m.dose_is_custom) return patch;
  const v = m.dose_value;
  if (v === undefined || v === null || Number.isNaN(Number(v))) return patch;
  const inList = presets.some((p) => Math.abs(p - v) < 1e-6);
  if (inList) return patch;
  return {
    ...patch,
    dose_is_custom: true,
    dose_custom_text: formatDoseDisplay(v),
  };
}

/** Fast OPD presets — mutually exclusive with each other & with “More” interval modes. */
export const FREQUENCY_PRIMARY_CHIPS = [
  { id: "OD", label: "OD" },
  { id: "BD", label: "BD" },
  { id: "TDS", label: "TDS" },
] as const;

/** PRN / one-time — separate row. */
export const FREQUENCY_SPECIAL_CHIPS = [
  { id: "SOS", label: "SOS" },
  { id: "STAT", label: "STAT" },
] as const;

/** Extended schedules (More ▼). IDs stored in `frequency_id`. Disables inline M/A/N pattern in UI. */
export const FREQUENCY_MORE_OPTIONS = [
  { id: "EVERY_4H", label: "Every 4 hours", shortLabel: "Every 4h" },
  { id: "EVERY_6H", label: "Every 6 hours", shortLabel: "Every 6h" },
  { id: "EVERY_8H", label: "Every 8 hours", shortLabel: "Every 8h" },
  { id: "EVERY_12H", label: "Every 12 hours", shortLabel: "Every 12h" },
  { id: "ALT_DAYS", label: "Alternate days", shortLabel: "Alt days" },
  { id: "ONCE_WEEKLY", label: "Weekly once", shortLabel: "Weekly" },
  { id: "CUSTOM_INTERVAL", label: "Custom interval", shortLabel: "Custom" },
] as const;

/** Morning / afternoon / night pattern stored as `m-a-n` in `frequency_custom_text`. */
export const FREQUENCY_PATTERN_ID = "PATTERN" as const;

export function patternStringFromSlots(
  morning: boolean,
  afternoon: boolean,
  night: boolean
): string {
  return `${morning ? 1 : 0}-${afternoon ? 1 : 0}-${night ? 1 : 0}`;
}

export function matchesBdPattern(morning: boolean, afternoon: boolean, night: boolean): boolean {
  return morning && !afternoon && night;
}

export function matchesTdsPattern(morning: boolean, afternoon: boolean, night: boolean): boolean {
  return morning && afternoon && night;
}

export function matchesOdPattern(morning: boolean, afternoon: boolean, night: boolean): boolean {
  return morning && !afternoon && !night;
}

/** When user taps OD / BD / TDS — sync inline pattern (M/A/N). Legacy `QID` id uses same slots as TDS. */
export function slotsFromPrimaryChipId(
  id: string
): { morning: boolean; afternoon: boolean; night: boolean } {
  switch (id) {
    case "OD":
      return { morning: true, afternoon: false, night: false };
    case "BD":
      return { morning: true, afternoon: false, night: true };
    case "TDS":
    case "QID":
      return { morning: true, afternoon: true, night: true };
    default:
      return { morning: true, afternoon: false, night: true };
  }
}

/**
 * Map inline pattern to stored frequency_id (auto-sync when pattern changes).
 * Non-standard shapes → PATTERN + `frequency_custom_text` m-a-n.
 */
export function deriveFrequencyIdFromPatternSlots(
  morning: boolean,
  afternoon: boolean,
  night: boolean
): typeof FREQUENCY_PATTERN_ID | "OD" | "BD" | "TDS" {
  if (matchesOdPattern(morning, afternoon, night)) return "OD";
  if (matchesBdPattern(morning, afternoon, night)) return "BD";
  if (matchesTdsPattern(morning, afternoon, night)) return "TDS";
  return FREQUENCY_PATTERN_ID;
}

/**
 * Combined frequency UI (no Standard/Pattern toggle): a primary chip is selected if it
 * matches `frequency_id`, or if `frequency_id` is `PATTERN` but M/A/N slots map to OD/BD/TDS.
 */
export function primaryFrequencyChipSelected(
  m: Pick<
    MedicinePrescriptionDetail,
    | "frequency_id"
    | "frequency_pattern_morning"
    | "frequency_pattern_afternoon"
    | "frequency_pattern_night"
  >,
  chipId: "OD" | "BD" | "TDS"
): boolean {
  const id = m.frequency_id ?? "";
  if (id === chipId) return true;
  if (id === FREQUENCY_PATTERN_ID) {
    const pm = m.frequency_pattern_morning ?? false;
    const pa = m.frequency_pattern_afternoon ?? false;
    const pn = m.frequency_pattern_night ?? false;
    return deriveFrequencyIdFromPatternSlots(pm, pa, pn) === chipId;
  }
  return false;
}

const FREQUENCY_MORE_IDS = new Set<string>(FREQUENCY_MORE_OPTIONS.map((o) => o.id));

/** SOS, STAT, and any “More ▼” interval hide/disable the M/A/N pattern row. */
export function isPatternSectionDisabled(frequencyId: string | undefined): boolean {
  const id = frequencyId ?? "";
  if (id === "SOS" || id === "STAT") return true;
  return FREQUENCY_MORE_IDS.has(id);
}

/** @deprecated use FREQUENCY_PRIMARY_CHIPS + SPECIAL + MORE */
export const FREQUENCY_CHIPS = [
  ...FREQUENCY_PRIMARY_CHIPS,
  ...FREQUENCY_SPECIAL_CHIPS,
] as const;

export function isMoreFrequencyId(id: string | undefined): boolean {
  return FREQUENCY_MORE_IDS.has(id ?? "");
}

export function getFrequencyDisplayLabel(
  m: Pick<
    MedicinePrescriptionDetail,
    "frequency_id" | "frequency_custom_text"
  >
): string {
  const id = m.frequency_id ?? "";
  if (!id) return "";
  if (id === FREQUENCY_PATTERN_ID) {
    const t = String(m.frequency_custom_text ?? "").trim();
    return t ? `Pattern: ${t}` : "Custom pattern";
  }
  if (id === "CUSTOM") {
    const t = String(m.frequency_custom_text ?? "").trim();
    return t ? `Custom: ${t}` : "Custom frequency";
  }
  const fromMore = FREQUENCY_MORE_OPTIONS.find((o) => o.id === id);
  if (fromMore) return fromMore.label;
  const fromPrimary = FREQUENCY_PRIMARY_CHIPS.find((o) => o.id === id);
  if (fromPrimary) return fromPrimary.label;
  const fromSpecial = FREQUENCY_SPECIAL_CHIPS.find((o) => o.id === id);
  if (fromSpecial) return fromSpecial.label;
  return id;
}

/**
 * Single “Active:” line for the Frequency section — interval, SOS/STAT, OD/BD/TDS, or Custom (m-a-n).
 */
export function getActiveFrequencySummary(
  m: Pick<
    MedicinePrescriptionDetail,
    | "frequency_id"
    | "frequency_custom_text"
    | "frequency_pattern_morning"
    | "frequency_pattern_afternoon"
    | "frequency_pattern_night"
  >
): string {
  const id = m.frequency_id ?? "";
  if (!id) return "";
  if (isMoreFrequencyId(id)) {
    return FREQUENCY_MORE_OPTIONS.find((o) => o.id === id)?.label ?? id;
  }
  if (id === "SOS") return "SOS";
  if (id === "STAT") return "STAT";
  if (id === "CUSTOM") {
    const t = String(m.frequency_custom_text ?? "").trim();
    return t ? `Custom: ${t}` : "Custom frequency";
  }
  if (id === FREQUENCY_PATTERN_ID) {
    const pm = m.frequency_pattern_morning ?? false;
    const pa = m.frequency_pattern_afternoon ?? false;
    const pn = m.frequency_pattern_night ?? false;
    return `Pattern ${patternStringFromSlots(pm, pa, pn)}`;
  }
  if (id === "QID") return "QID";
  const pm = m.frequency_pattern_morning ?? false;
  const pa = m.frequency_pattern_afternoon ?? false;
  const pn = m.frequency_pattern_night ?? false;
  const s = patternStringFromSlots(pm, pa, pn);
  if (matchesBdPattern(pm, pa, pn)) return "BD";
  if (matchesTdsPattern(pm, pa, pn)) return "TDS";
  if (matchesOdPattern(pm, pa, pn)) return "OD";
  return `Custom (${s})`;
}

export const TIMING_OPTIONS: { id: MedicineTiming; label: string }[] = [
  { id: "before_food", label: "Before Food" },
  { id: "after_food", label: "After Food" },
  { id: "empty_stomach", label: "Empty Stomach" },
  { id: "bedtime", label: "Bedtime" },
];

/** @deprecated use DURATION_QUICK_CHIPS */
export const DURATION_QUICK_DAYS = [3, 5, 7] as const;

/** OPD quick picks — single row; other lengths via numeric input + unit. */
export const DURATION_QUICK_CHIPS: readonly {
  value: number;
  unit: "days" | "weeks" | "months";
  label: string;
}[] = [
  { value: 1, unit: "days", label: "1d" },
  { value: 2, unit: "days", label: "2d" },
  { value: 3, unit: "days", label: "3d" },
  { value: 5, unit: "days", label: "5d" },
  { value: 7, unit: "days", label: "7d" },
] as const;

/** Mutually exclusive with numeric duration; parallel row below quick chips. */
export const DURATION_SPECIAL_CHIPS: readonly {
  id: MedicineDurationSpecial;
  label: string;
}[] = [
  { id: "sos", label: "SOS" },
  { id: "till_required", label: "Till Required" },
  { id: "continue", label: "Continue" },
  { id: "stat", label: "STAT" },
] as const;

export const DURATION_UNIT_OPTIONS = [
  { id: "days" as const, label: "days" },
  { id: "weeks" as const, label: "weeks" },
  { id: "months" as const, label: "months" },
];

/** Single-line summary for duration row + API `duration_display`. */
export function getDurationDisplaySummary(
  m: Pick<
    MedicinePrescriptionDetail,
    "duration_value" | "duration_unit" | "duration_special"
  >
): string {
  const sp = m.duration_special;
  if (sp === "sos") return "SOS";
  if (sp === "till_required") return "Till required";
  if (sp === "continue") return "Continue";
  if (sp === "stat") return "STAT";
  const raw = m.duration_value ?? 5;
  const v = Math.max(1, Math.floor(Number(raw)));
  const u = m.duration_unit ?? "days";
  if (u === "days") return `${v} day${v === 1 ? "" : "s"}`;
  if (u === "weeks") return `${v} week${v === 1 ? "" : "s"}`;
  return `${v} month${v === 1 ? "" : "s"}`;
}

export const ROUTE_OPTIONS = [
  { id: "oral", label: "Oral" },
  { id: "iv", label: "IV" },
  { id: "im", label: "IM" },
  { id: "topical", label: "Topical" },
  { id: "inhalation", label: "Inhalation" },
  { id: "other", label: "Other" },
] as const;

/** Quick picks for Body Site (Topical / Other); route stays separate. */
export const ROUTE_BODY_SITE_SUGGESTIONS = [
  "Eye",
  "Ear",
  "Nose",
  "Skin",
  "Nostrils",
] as const;

/** Body site — only when route is Other (topical uses dose/route only). */
export function routeShowsBodySite(routeId: string | undefined): boolean {
  return (routeId ?? "") === "other";
}

/** Order suggestions by dose form (drops vs cream, etc.). */
export function getRouteBodySiteSuggestionChips(doseUnitId: string | undefined): string[] {
  const u = (doseUnitId ?? "").toLowerCase();
  const all = [...ROUTE_BODY_SITE_SUGGESTIONS];
  if (u === "cream" || u === "ointment" || u === "gel") {
    return ["Skin", "Eye", "Ear", "Nose", "Nostrils"];
  }
  if (u === "drops") {
    return ["Eye", "Ear", "Nose", "Skin", "Nostrils"];
  }
  return all;
}

/** Drives smart default frequency when adding from catalog (mock / future API). */
type DrugCategory = "antibiotic" | "painkiller" | "chronic" | "syrup" | "generic";

function defaultFrequencyForCategory(cat: DrugCategory | undefined): {
  frequency_id: string;
  is_prn: boolean;
} {
  switch (cat) {
    case "antibiotic":
      return { frequency_id: "BD", is_prn: false };
    case "painkiller":
      return { frequency_id: "SOS", is_prn: true };
    case "chronic":
      return { frequency_id: "OD", is_prn: false };
    case "syrup":
      return { frequency_id: "TDS", is_prn: false };
    default:
      return { frequency_id: "BD", is_prn: false };
  }
}

/** Optional catalog metadata for static medicine ids (local demo data). */
const MEDICINE_CATALOG: Record<
  string,
  {
    strength?: string;
    generic_name?: string;
    composition?: string;
    dose_unit_id?: string;
    drug_category?: DrugCategory;
  }
> = {
  paracetamol: {
    strength: "500mg",
    generic_name: "Paracetamol",
    composition: "Paracetamol 500mg",
    dose_unit_id: "tablet",
    drug_category: "painkiller",
  },
  ibuprofen: {
    strength: "200mg",
    generic_name: "Ibuprofen",
    composition: "Ibuprofen 200mg",
    dose_unit_id: "tablet",
    drug_category: "painkiller",
  },
  amoxicillin: {
    strength: "500mg",
    generic_name: "Amoxicillin",
    composition: "Amoxicillin trihydrate 500mg",
    dose_unit_id: "tablet",
    drug_category: "antibiotic",
  },
  omeprazole: {
    strength: "20mg",
    generic_name: "Omeprazole",
    composition: "Omeprazole 20mg",
    dose_unit_id: "tablet",
    drug_category: "generic",
  },
  cetirizine: {
    strength: "10mg",
    generic_name: "Cetirizine",
    composition: "Cetirizine 10mg",
    dose_unit_id: "tablet",
    drug_category: "syrup",
  },
  metformin: {
    strength: "500mg",
    generic_name: "Metformin",
    composition: "Metformin hydrochloride 500mg",
    dose_unit_id: "tablet",
    drug_category: "chronic",
  },
  amlodipine: {
    strength: "5mg",
    generic_name: "Amlodipine",
    composition: "Amlodipine besylate 5mg",
    dose_unit_id: "tablet",
    drug_category: "chronic",
  },
  azithromycin: {
    strength: "500mg",
    generic_name: "Azithromycin",
    composition: "Azithromycin 500mg",
    dose_unit_id: "tablet",
    drug_category: "antibiotic",
  },
  dolo: {
    strength: "650mg",
    generic_name: "Paracetamol",
    composition: "Paracetamol 650mg",
    dose_unit_id: "tablet",
    drug_category: "painkiller",
  },
  crocin: {
    strength: "500mg",
    generic_name: "Paracetamol",
    composition: "Paracetamol 500mg",
    dose_unit_id: "tablet",
    drug_category: "painkiller",
  },
};

export function formatMedicineLabel(name: string, strength?: string): string {
  const s = strength?.trim();
  if (!s) return name.trim();
  return `${name.trim()} (${s})`;
}

function strengthFromLabel(label: string): string | undefined {
  const m = /\(([^)]+)\)\s*$/.exec(label.trim());
  return m ? m[1].trim() : undefined;
}

/**
 * Custom-medicine quick-add: same dose forms as the prescription panel (`DOSE_UNIT_OPTIONS`).
 */
export const CUSTOM_MEDICINE_QUICK_ADD_DOSE_TYPES: readonly { id: string; label: string }[] =
  DOSE_UNIT_OPTIONS;

/** Strength row units (custom medicine quick-add; doctor can override any default). */
export const CUSTOM_MEDICINE_STRENGTH_UNITS: readonly { id: string; label: string }[] = [
  { id: "mg", label: "mg" },
  { id: "mcg", label: "mcg" },
  { id: "g", label: "g" },
  { id: "ml", label: "ml" },
  { id: "iu", label: "IU" },
  { id: "puff", label: "puff" },
  { id: "%", label: "%" },
] as const;

/** Default strength unit when dose type changes (volume vs mass vs IU vs actuations). */
const QUICK_ADD_DEFAULT_STRENGTH_UNIT_BY_DOSE_TYPE: Record<string, string> = {
  tablet: "mg",
  capsule: "mg",
  sachet: "mg",
  syrup: "ml",
  ml: "ml",
  drops: "ml",
  injection: "ml",
  ampoule: "ml",
  vial: "ml",
  insulin: "iu",
  units: "iu",
  cream: "g",
  ointment: "g",
  gel: "g",
  spray: "ml",
  patch: "mg",
  suppository: "mg",
  inhaler: "puff",
  nebulizer: "ml",
  powder: "g",
  other: "mg",
};

const QUICK_ADD_STRENGTH_PLACEHOLDER_BY_DOSE_TYPE: Record<string, string> = {
  tablet: "e.g. 500 mg",
  capsule: "e.g. 250 mg",
  sachet: "e.g. 5 g",
  syrup: "e.g. 120 ml",
  ml: "e.g. 10 ml",
  drops: "e.g. 5 ml",
  injection: "e.g. 2 ml",
  ampoule: "e.g. 2 ml",
  vial: "e.g. 10 ml",
  insulin: "e.g. 10 IU",
  units: "e.g. 20 IU",
  cream: "e.g. 15 g",
  ointment: "e.g. 20 g",
  gel: "e.g. 25 g",
  spray: "e.g. 50 ml",
  patch: "e.g. 25 mg",
  suppository: "e.g. 500 mg",
  inhaler: "e.g. 2 puffs",
  nebulizer: "e.g. 3 ml",
  powder: "e.g. 1 g",
  other: "e.g. 500 mg",
};

export function defaultStrengthUnitForDoseType(doseTypeId: string): string {
  const u = doseTypeId?.trim().toLowerCase() ?? "";
  return QUICK_ADD_DEFAULT_STRENGTH_UNIT_BY_DOSE_TYPE[u] ?? "mg";
}

export function customMedicineStrengthPlaceholder(doseTypeId: string): string {
  const u = doseTypeId?.trim().toLowerCase() ?? "";
  return QUICK_ADD_STRENGTH_PLACEHOLDER_BY_DOSE_TYPE[u] ?? "e.g. 500 mg";
}

/** Light sanity ranges for strength (warn only; never block save). Unknown units → no range warning. */
export const CUSTOM_MEDICINE_STRENGTH_UNIT_LIMITS: Record<
  string,
  { min: number; max: number }
> = {
  mg: { min: 1, max: 2000 },
  ml: { min: 1, max: 1000 },
  g: { min: 1, max: 500 },
  mcg: { min: 1, max: 50000 },
  iu: { min: 1, max: 20000 },
  puff: { min: 1, max: 100 },
  "%": { min: 0.01, max: 100 },
};

/**
 * Typical strength units per dose form — for soft hints when the picked unit is unusual.
 * Empty list = skip mismatch hint (e.g. `other`).
 */
const TYPICAL_STRENGTH_UNITS_FOR_DOSE_TYPE: Record<string, string[]> = {
  tablet: ["mg", "mcg"],
  capsule: ["mg", "mcg"],
  sachet: ["mg", "g"],
  syrup: ["ml"],
  ml: ["ml"],
  drops: ["ml"],
  injection: ["ml", "iu"],
  ampoule: ["ml"],
  vial: ["ml"],
  insulin: ["iu"],
  units: ["iu"],
  cream: ["g", "mg", "%"],
  ointment: ["g", "mg", "%"],
  gel: ["g", "mg", "%"],
  spray: ["ml", "g"],
  patch: ["mg"],
  suppository: ["mg"],
  inhaler: ["puff"],
  nebulizer: ["ml"],
  powder: ["g", "mg"],
  other: [],
};

export type ParsedCustomMedicineStrength =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "ok"; value: number };

/**
 * Strength is optional: empty → `empty`. Non-empty must be a positive decimal number.
 */
export function parseCustomMedicineStrengthValue(raw: string): ParsedCustomMedicineStrength {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };
  const normalized = trimmed.replace(/,/g, ".");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return { kind: "invalid", message: "Enter a valid number" };
  }
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n <= 0) {
    return { kind: "invalid", message: "Enter a valid number" };
  }
  return { kind: "ok", value: n };
}

function strengthUnitLabel(unitId: string): string {
  const u = unitId?.trim().toLowerCase() ?? "";
  return CUSTOM_MEDICINE_STRENGTH_UNITS.find((x) => x.id === u)?.label ?? unitId;
}

/** Soft: typical numeric band for this strength unit. Returns null if unknown unit or in range. */
export function getCustomMedicineStrengthRangeWarning(
  value: number,
  strengthUnitId: string
): string | null {
  const key = strengthUnitId?.trim().toLowerCase() ?? "";
  const limits = CUSTOM_MEDICINE_STRENGTH_UNIT_LIMITS[key];
  if (!limits) return null;
  if (value < limits.min || value > limits.max) {
    const lbl = strengthUnitLabel(key);
    return `Typical range is ${limits.min}–${limits.max} ${lbl}`;
  }
  return null;
}

/** Soft: dose form vs strength unit. Returns null if no typical list or unit fits. */
export function getCustomMedicineDoseTypeStrengthUnitWarning(
  doseTypeId: string,
  strengthUnitId: string
): string | null {
  const d = doseTypeId?.trim().toLowerCase() ?? "";
  const u = strengthUnitId?.trim().toLowerCase() ?? "";
  const typical = TYPICAL_STRENGTH_UNITS_FOR_DOSE_TYPE[d];
  if (!typical || typical.length === 0) return null;
  if (typical.includes(u)) return null;
  const labels = typical.map(strengthUnitLabel).join(", ");
  return `Usually used with ${labels} for this dose type`;
}

/**
 * Prescription draft for a doctor-added custom medicine (quick-add drawer).
 * `itemId` should be the section item id once known — for catalog lookup safety use a temp id until parent assigns.
 */
export function buildMedicinePrescriptionForCustomEntry(
  itemId: string,
  label: string,
  input: {
    doseTypeId: string;
    strengthValue?: number | null;
    strengthUnit?: string;
    notes?: string;
  }
): MedicinePrescriptionDetail {
  const trimmedName = label.trim();
  const doseType = (input.doseTypeId || "tablet").trim().toLowerCase();
  const base = buildDefaultMedicinePrescription(itemId, trimmedName);
  const unitPatch = patchMedicineAfterUnitChange({ ...base, dose_unit_id: base.dose_unit_id }, doseType);
  let merged: MedicinePrescriptionDetail = {
    ...base,
    ...unitPatch,
    dose_unit_id: doseType,
    is_custom: true,
    drug_id: itemId,
    generic_name: trimmedName,
    composition: trimmedName,
    instructions: input.notes?.trim() ? input.notes.trim() : base.instructions,
  };

  const rawVal = input.strengthValue;
  const hasNum =
    rawVal != null &&
    !Number.isNaN(Number(rawVal)) &&
    Number(rawVal) > 0;
  const uStr = String(input.strengthUnit ?? "").trim();
  if (hasNum && uStr) {
    const num = Number(rawVal);
    merged.custom_strength_value = num;
    merged.custom_strength_unit = uStr;
    merged.strength_label = `${formatDoseDisplay(num)} ${uStr}`;
  }

  return merged;
}

export function buildDefaultMedicinePrescription(
  drugId: string,
  label: string
): MedicinePrescriptionDetail {
  const meta = MEDICINE_CATALOG[drugId];
  const strength = meta?.strength ?? strengthFromLabel(label);
  const displayPieces = label.split("(");
  const nameOnly = displayPieces[0]?.trim() ?? label;
  const freq = defaultFrequencyForCategory(meta?.drug_category);
  let frequency_pattern_morning = true;
  let frequency_pattern_afternoon = false;
  let frequency_pattern_night = true;
  let frequency_custom_text = "1-0-1";
  if (freq.frequency_id === "SOS" || freq.frequency_id === "STAT") {
    frequency_pattern_morning = false;
    frequency_pattern_afternoon = false;
    frequency_pattern_night = false;
    frequency_custom_text = "";
  } else {
    const slots = slotsFromPrimaryChipId(freq.frequency_id);
    frequency_pattern_morning = slots.morning;
    frequency_pattern_afternoon = slots.afternoon;
    frequency_pattern_night = slots.night;
    frequency_custom_text = patternStringFromSlots(slots.morning, slots.afternoon, slots.night);
  }
  return {
    drug_id: drugId,
    strength_label: strength,
    generic_name: meta?.generic_name ?? nameOnly,
    composition: meta?.composition ?? label,
    dose_value: 1,
    dose_unit_id: meta?.dose_unit_id ?? "tablet",
    dose_is_custom: false,
    dose_custom_text: "",
    route_id: "oral",
    route_body_site: "",
    frequency_id: freq.frequency_id,
    frequency_ui_mode: "standard",
    frequency_pattern_morning,
    frequency_pattern_afternoon,
    frequency_pattern_night,
    frequency_custom_text,
    duration_value: 5,
    duration_unit: "days",
    duration_special: undefined,
    duration_is_custom: false,
    duration_custom_text: "",
    timing: ["after_food"],
    instructions: "",
    is_prn: freq.is_prn,
    is_stat: false,
    is_chronic: false,
  };
}

export function medicineNeedsDose(m: MedicinePrescriptionDetail | undefined): boolean {
  if (!m) return true;
  /** Cream / ointment — dose optional; never block on dose. */
  if (m.route_id === "topical") return false;
  if (m.dose_is_custom) {
    const t = String(m.dose_custom_text ?? "").trim();
    if (!t) return true;
    const n = parseFloat(t.replace(/,/g, "."));
    return Number.isNaN(n) || n <= 0;
  }
  const v = m.dose_value;
  return v === undefined || v === null || Number.isNaN(Number(v)) || Number(v) <= 0;
}

export function medicineNeedsFrequency(m: MedicinePrescriptionDetail | undefined): boolean {
  if (!m) return true;
  const id = String(m.frequency_id ?? "").trim();
  if (!id) return true;
  if (id === "CUSTOM") {
    return !String(m.frequency_custom_text ?? "").trim();
  }
  if (id === "CUSTOM_INTERVAL") {
    return !String(m.frequency_custom_text ?? "").trim();
  }
  if (id === FREQUENCY_PATTERN_ID) {
    const t = String(m.frequency_custom_text ?? "").trim();
    if (!/^[01]-[01]-[01]$/.test(t)) return true;
    if (t === "0-0-0") return true;
    return false;
  }
  return false;
}

export function getMedicineValidationMessages(
  item: ConsultationSectionItem
): string[] {
  const m = item.detail?.medicine;
  const msgs: string[] = [];
  if (medicineNeedsDose(m)) msgs.push("Dose required");
  if (medicineNeedsFrequency(m)) msgs.push("Frequency required");
  return msgs;
}

export function isMedicineItemComplete(item: ConsultationSectionItem): boolean {
  return getMedicineValidationMessages(item).length === 0;
}

export type MedicineCompletionLevel = "complete" | "partial" | "critical";

export interface MedicineCompletionStatus {
  level: MedicineCompletionLevel;
  /** Human labels in order: Dose, Frequency */
  missing: ("Dose" | "Frequency")[];
  /** Plain text for aria / tooltips, e.g. "Dose + Frequency required" */
  message: string;
}

/**
 * Real-time prescription completeness for MVP: Dose + Frequency required;
 * Duration, route, timing optional (uses same rules as validation).
 */
export function getMedicineCompletionStatus(
  m: MedicinePrescriptionDetail | undefined
): MedicineCompletionStatus {
  const missing: ("Dose" | "Frequency")[] = [];
  if (medicineNeedsDose(m)) missing.push("Dose");
  if (medicineNeedsFrequency(m)) missing.push("Frequency");

  if (missing.length === 0) {
    return { level: "complete", missing: [], message: "Complete" };
  }
  const parts = missing.join(" + ");
  return {
    level: missing.length >= 2 ? "critical" : "partial",
    missing,
    message: `${parts} required`,
  };
}

function effectiveDoseNumeric(m: MedicinePrescriptionDetail): number {
  if (m.dose_is_custom) {
    const t = String(m.dose_custom_text ?? "").trim();
    const n = parseFloat(t.replace(/,/g, "."));
    return Number.isNaN(n) ? 0 : n;
  }
  return Number(m.dose_value ?? 0);
}

/** Maps UI state to the contract JSON shape for API handoff later. */
export function medicinePrescriptionToPayload(
  m: MedicinePrescriptionDetail,
  meta?: { is_custom_drug?: boolean }
) {
  const isPattern = m.frequency_id === FREQUENCY_PATTERN_ID;
  return {
    drug_id: m.drug_id ?? "",
    dose_value: effectiveDoseNumeric(m),
    dose_unit_id: m.dose_unit_id ?? "",
    route_id: m.route_id ?? "",
    route_body_site: m.route_body_site ?? "",
    frequency_id: m.frequency_id ?? "",
    frequency_custom_text: m.frequency_custom_text ?? "",
    /** API-friendly: custom MAN pattern vs standard chip/interval ids. */
    frequency: isPattern ? "custom" : "standard",
    pattern: isPattern ? (m.frequency_custom_text ?? "") : "",
    frequency_display: getActiveFrequencySummary(m),
    duration_value: m.duration_special ? 0 : (m.duration_value ?? 0),
    duration_unit: m.duration_unit ?? "days",
    duration_special: m.duration_special ?? null,
    duration_display: getDurationDisplaySummary(m),
    timing: m.timing ?? [],
    instructions: m.instructions ?? "",
    is_prn: Boolean(m.is_prn || (m.frequency_id === "SOS")),
    is_stat: Boolean(m.is_stat),
    is_chronic: Boolean(m.is_chronic),
    is_custom_drug: Boolean(meta?.is_custom_drug ?? m.is_custom),
    /** Mirrors UX spec / future API (`is_custom`, structured strength on custom rows). */
    is_custom: Boolean(m.is_custom || meta?.is_custom_drug),
    dose_type: m.dose_unit_id ?? "",
    strength_value: m.custom_strength_value ?? null,
    strength_unit: m.custom_strength_unit ?? null,
    notes: m.instructions ?? "",
  };
}

/** Attach default `detail.medicine` when adding a medicine row (id + label from catalog or custom). */
export function withDefaultMedicineDetail(item: ConsultationSectionItem): ConsultationSectionItem {
  if (item.detail?.medicine) return item;
  return {
    ...item,
    detail: {
      ...item.detail,
      medicine: buildDefaultMedicinePrescription(item.id, item.label),
    },
  };
}
