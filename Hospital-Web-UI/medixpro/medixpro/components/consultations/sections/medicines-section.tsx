"use client";

/**
 * Live consultation uses `ConsultationSection` with `type="medicines"` (start-consultation page)
 * plus `MedicineDetailPanel` in the right column — not this component.
 *
 * Re-exports prescription constants for tests or future embedded UIs.
 */
export {
  DOSE_UNIT_OPTIONS,
  formatDoseDisplay,
  getDosePresetChips,
  patchMedicineAfterUnitChange,
  FREQUENCY_CHIPS,
  FREQUENCY_PRIMARY_CHIPS,
  FREQUENCY_SPECIAL_CHIPS,
  FREQUENCY_MORE_OPTIONS,
  FREQUENCY_PATTERN_ID,
  getFrequencyDisplayLabel,
  isMoreFrequencyId,
  matchesBdPattern,
  patternStringFromSlots,
  DURATION_QUICK_CHIPS,
  DURATION_QUICK_DAYS,
  DURATION_SPECIAL_CHIPS,
  DURATION_UNIT_OPTIONS,
  getDurationDisplaySummary,
  ROUTE_OPTIONS,
  ROUTE_BODY_SITE_SUGGESTIONS,
  routeShowsBodySite,
  getRouteBodySiteSuggestionChips,
  TIMING_OPTIONS,
  buildDefaultMedicinePrescription,
  medicinePrescriptionToPayload,
  withDefaultMedicineDetail,
  getMedicineValidationMessages,
  getMedicineCompletionStatus,
  isMedicineItemComplete,
} from "@/lib/medicine-prescription-utils";
