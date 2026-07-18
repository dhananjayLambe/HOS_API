/**
 * UI modality groups for the consultation CDS reports panel.
 * Maps doctor-facing categories onto freeform DiagnosticCategory name/code strings
 * (no fixed DB enum). Filtering is client-side keyword match.
 */

export type ClinicalModality =
  | "laboratory"
  | "radiology"
  | "cardiology"
  | "pathology";

export type ClinicalModalityOption = {
  id: ClinicalModality;
  label: string;
  /** Expected catalog codes (documented; used when category equals code). */
  codes: string[];
  /** Keywords matched against category + test name (case-insensitive). */
  keywords: string[];
};

export const CLINICAL_MODALITY_OPTIONS: ClinicalModalityOption[] = [
  {
    id: "laboratory",
    label: "Laboratory",
    codes: ["LAB", "LABORATORY", "BIOCHEMISTRY", "HEMATOLOGY", "MICROBIOLOGY"],
    keywords: [
      "lab",
      "laboratory",
      "cbc",
      "blood",
      "biochem",
      "hematol",
      "haematol",
      "serolog",
      "urine",
      "sugar",
      "glucose",
      "hba1c",
      "lft",
      "kft",
      "lipid",
      "thyroid",
      "tsh",
      "culture",
    ],
  },
  {
    id: "radiology",
    label: "Radiology",
    codes: ["RAD", "RADIOLOGY", "IMAGING"],
    keywords: [
      "radio",
      "x-ray",
      "xray",
      "ct",
      "mri",
      "ultrasound",
      "usg",
      "sonograph",
      "imaging",
      "scan",
      "mammog",
    ],
  },
  {
    id: "cardiology",
    label: "Cardiology",
    codes: ["CARD", "CARDIOLOGY"],
    keywords: [
      "cardio",
      "ecg",
      "ekg",
      "echo",
      "stress",
      "holter",
      "tmt",
      "cardiac",
    ],
  },
  {
    id: "pathology",
    label: "Pathology",
    codes: ["PATH", "PATHOLOGY", "HISTOPATH"],
    keywords: [
      "patholog",
      "biopsy",
      "histo",
      "cytolog",
      "fnac",
      "pap smear",
    ],
  },
];

function keywordMatches(hay: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  if (kw.length <= 3) {
    // Short tokens (CT, MRI, CBC) — whole-word / boundary match only
    const re = new RegExp(
      `(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      "i"
    );
    return re.test(hay);
  }
  return hay.includes(kw);
}

export function resolveClinicalModality(
  category: string | null | undefined,
  testName?: string | null
): ClinicalModality | null {
  const hay = `${category ?? ""} ${testName ?? ""}`.trim().toLowerCase();
  if (!hay) return null;

  const code = (category ?? "").trim().toUpperCase();
  for (const option of CLINICAL_MODALITY_OPTIONS) {
    if (option.codes.some((c) => c === code)) return option.id;
  }

  for (const option of CLINICAL_MODALITY_OPTIONS) {
    if (option.keywords.some((kw) => keywordMatches(hay, kw))) return option.id;
  }
  return null;
}

export function matchesClinicalModality(
  category: string | null | undefined,
  testName: string | null | undefined,
  modality: ClinicalModality | null
): boolean {
  if (!modality) return true;
  return resolveClinicalModality(category, testName) === modality;
}

/** Documented category codes for ops/seed alignment (not enforced by API). */
export function documentedModalityCategoryCodes(): Record<
  ClinicalModality,
  string[]
> {
  return Object.fromEntries(
    CLINICAL_MODALITY_OPTIONS.map((o) => [o.id, [...o.codes]])
  ) as Record<ClinicalModality, string[]>;
}
