/**
 * DoctorProCare clinical design tokens — class presets and helpers
 * for Reports Workspace and future EMR modules.
 */

import type { ClinicalReportStatus } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

/** Elevation / surface class presets (3-level card system). */
export const surfacePage = "bg-[hsl(var(--clinical-surface-page))]";
export const surfaceSection =
  "rounded-xl border border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] shadow-[0_1px_2px_0_hsl(var(--clinical-elevation-sm)/0.04)]";
export const surfaceInteractive =
  "bg-[hsl(var(--clinical-surface-interactive))] transition-colors duration-150";

/** Typography scale presets. */
export const typePageTitle =
  "text-[1.875rem] font-bold leading-tight tracking-tight text-[hsl(var(--clinical-text-primary))] md:text-[2rem]";
export const typeSectionTitle =
  "text-lg font-semibold leading-snug tracking-tight text-[hsl(var(--clinical-text-primary))] md:text-xl";
export const typePatientName =
  "text-xl font-semibold leading-tight tracking-tight text-[hsl(var(--clinical-text-primary))] sm:text-2xl";
export const typeTableHead =
  "text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--clinical-text-meta))]";
export const typeMeta =
  "text-xs leading-snug text-[hsl(var(--clinical-text-meta))] sm:text-[13px]";

/** Soft KPI / status tint backgrounds. */
export const tintAvailable =
  "border-[hsl(var(--clinical-accent-available)/0.25)] bg-[hsl(var(--clinical-accent-available-soft))]";
export const tintAwaiting =
  "border-[hsl(var(--clinical-accent-awaiting)/0.3)] bg-[hsl(var(--clinical-accent-awaiting-soft))]";
export const tintCritical =
  "border-[hsl(var(--clinical-accent-critical)/0.3)] bg-[hsl(var(--clinical-accent-critical-soft))]";
export const tintUpdated =
  "border-[hsl(var(--clinical-accent-updated)/0.25)] bg-[hsl(var(--clinical-accent-updated-soft))]";
export const tintArchived =
  "border-[hsl(var(--clinical-accent-archived)/0.2)] bg-[hsl(var(--clinical-accent-archived-soft))]";

export type ClinicalStatusTone =
  | "available"
  | "awaiting"
  | "updated"
  | "critical"
  | "archived";

export function clinicalStatusTone(
  status: ClinicalReportStatus
): ClinicalStatusTone {
  switch (status) {
    case "AVAILABLE":
      return "available";
    case "AWAITING_REPORT":
      return "awaiting";
    case "UPDATED":
      return "updated";
    default:
      return "available";
  }
}

/** Badge / chip classes mapped from clinical status. */
export function clinicalStatusBadgeClasses(status: ClinicalReportStatus): string {
  switch (clinicalStatusTone(status)) {
    case "available":
      return "border-[hsl(var(--clinical-accent-available)/0.35)] bg-[hsl(var(--clinical-accent-available-soft))] text-[hsl(var(--clinical-accent-available))]";
    case "awaiting":
      return "border-[hsl(var(--clinical-accent-awaiting)/0.4)] bg-[hsl(var(--clinical-accent-awaiting-soft))] text-amber-900 dark:text-amber-100";
    case "updated":
      return "border-[hsl(var(--clinical-accent-updated)/0.35)] bg-[hsl(var(--clinical-accent-updated-soft))] text-[hsl(var(--clinical-accent-updated))]";
    case "archived":
      return "border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-accent-archived-soft))] text-[hsl(var(--clinical-accent-archived))]";
    case "critical":
      return "border-[hsl(var(--clinical-accent-critical)/0.4)] bg-[hsl(var(--clinical-accent-critical-soft))] text-[hsl(var(--clinical-accent-critical))]";
    default:
      return "";
  }
}

/** KPI queue → tint classes. */
export function kpiTintForQueue(
  queue: "reports_ready" | "critical" | "awaiting"
): string {
  switch (queue) {
    case "reports_ready":
      return tintAvailable;
    case "critical":
      return tintCritical;
    case "awaiting":
      return tintAwaiting;
  }
}

/**
 * Strip file extensions and normalize artifact labels for clinical tabs.
 * "CBC Report.pdf" → "CBC Report"
 * "Peripheral smear.jpg" → "Peripheral Smear"
 */
export function formatArtifactTabLabel(label: string): string {
  const stripped = label.replace(/\.(pdf|jpg|jpeg|png|gif|webp|html|htm)$/i, "").trim();
  if (!stripped) return "Report";

  // Title-case words that are mostly lowercase (keep acronyms like CBC, ECG, LFT)
  return stripped
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      if (/^[A-Z0-9]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Row interaction presets for report browser. */
export const rowHover =
  "hover:bg-[hsl(var(--clinical-surface-interactive))] transition-colors duration-150";
export const rowSelected =
  "bg-[hsl(var(--clinical-accent-available-soft))] border-l-[3px] border-l-primary";
export const rowZebra = "even:bg-muted/20";
