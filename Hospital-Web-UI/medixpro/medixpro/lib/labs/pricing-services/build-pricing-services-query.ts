import type { PricingCatalogTab } from "@/lib/labs/api/pricing-services-types";
import type { PricingCatalogQueryInput } from "@/lib/labs/api/pricing-services";

export type PricingAvailabilityFilter = "" | "available" | "unavailable";
export type PricingActiveFilter = "" | "active" | "inactive";
export type PricingHomeCollectionFilter = "" | "true" | "false";
export type PricingTatPreset = "" | "fast" | "standard" | "extended";

export type PricingServicesFilterState = {
  availability: PricingAvailabilityFilter;
  activeStatus: PricingActiveFilter;
  homeCollection: PricingHomeCollectionFilter;
  tatPreset: PricingTatPreset;
};

/** KPI capsule keys — drive catalog tab + filter presets. */
export type PricingSummaryCapsuleId =
  | "available_tests"
  | "active_packages"
  | "home_collection"
  | "hidden_tests"
  | "avg_tat";

export type PricingSummaryCapsulePreset = {
  catalogTab: PricingCatalogTab;
  filters: PricingServicesFilterState;
  ordering?: string;
};

export function filtersForSummaryCapsule(capsule: PricingSummaryCapsuleId): PricingSummaryCapsulePreset {
  switch (capsule) {
    case "available_tests":
      return {
        catalogTab: "services",
        filters: {
          availability: "available",
          activeStatus: "active",
          homeCollection: "",
          tatPreset: "",
        },
      };
    case "active_packages":
      return {
        catalogTab: "packages",
        filters: {
          availability: "available",
          activeStatus: "active",
          homeCollection: "",
          tatPreset: "",
        },
      };
    case "home_collection":
      return {
        catalogTab: "services",
        filters: {
          availability: "available",
          activeStatus: "active",
          homeCollection: "true",
          tatPreset: "",
        },
      };
    case "hidden_tests":
      return {
        catalogTab: "services",
        filters: {
          availability: "unavailable",
          activeStatus: "active",
          homeCollection: "",
          tatPreset: "",
        },
      };
    case "avg_tat":
      return {
        catalogTab: "services",
        filters: {
          availability: "available",
          activeStatus: "active",
          homeCollection: "",
          tatPreset: "",
        },
        ordering: "report_delivery_hours",
      };
  }
}

export function detectSummaryCapsule(
  catalogTab: PricingCatalogTab,
  filters: PricingServicesFilterState,
): PricingSummaryCapsuleId | null {
  if (catalogTab === "packages") {
    if (
      filters.availability === "available" &&
      filters.activeStatus === "active" &&
      !filters.homeCollection &&
      !filters.tatPreset
    ) {
      return "active_packages";
    }
    return null;
  }
  if (
    filters.availability === "unavailable" &&
    filters.activeStatus === "active" &&
    !filters.homeCollection &&
    !filters.tatPreset
  ) {
    return "hidden_tests";
  }
  if (
    filters.homeCollection === "true" &&
    filters.activeStatus === "active" &&
    filters.availability === "available" &&
    !filters.tatPreset
  ) {
    return "home_collection";
  }
  if (
    filters.availability === "available" &&
    filters.activeStatus === "active" &&
    !filters.homeCollection &&
    !filters.tatPreset
  ) {
    return "available_tests";
  }
  return null;
}

export const DEFAULT_PRICING_SERVICES_FILTERS: PricingServicesFilterState = {
  availability: "",
  activeStatus: "",
  homeCollection: "",
  tatPreset: "",
};

export const PRICING_AVAILABILITY_OPTIONS: { id: PricingAvailabilityFilter; label: string }[] = [
  { id: "", label: "All availability" },
  { id: "available", label: "Available" },
  { id: "unavailable", label: "Hidden" },
];

export const PRICING_ACTIVE_OPTIONS: { id: PricingActiveFilter; label: string }[] = [
  { id: "", label: "All status" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export const PRICING_HOME_COLLECTION_OPTIONS: { id: PricingHomeCollectionFilter; label: string }[] = [
  { id: "", label: "All fulfillment" },
  { id: "true", label: "Home collection" },
  { id: "false", label: "Lab only" },
];

export const PRICING_TAT_OPTIONS: { id: PricingTatPreset; label: string }[] = [
  { id: "", label: "Any TAT" },
  { id: "fast", label: "≤ 12h" },
  { id: "standard", label: "13–24h" },
  { id: "extended", label: "25h+" },
];

function tatRangeForPreset(preset: PricingTatPreset): { tat_min?: number; tat_max?: number } {
  switch (preset) {
    case "fast":
      return { tat_max: 12 };
    case "standard":
      return { tat_min: 13, tat_max: 24 };
    case "extended":
      return { tat_min: 25 };
    default:
      return {};
  }
}

export function statusParamFromFilters(filters: PricingServicesFilterState): string | undefined {
  if (filters.availability === "available") return "available";
  if (filters.availability === "unavailable") return "unavailable";
  if (filters.activeStatus === "active") return "active";
  if (filters.activeStatus === "inactive") return "inactive";
  return undefined;
}

export function buildPricingQueryFromFilters(
  filters: PricingServicesFilterState,
  input: { q?: string; page?: number; page_size?: number; ordering?: string },
): PricingCatalogQueryInput {
  const tat = tatRangeForPreset(filters.tatPreset);
  return {
    q: input.q,
    status: statusParamFromFilters(filters),
    home_collection: filters.homeCollection || undefined,
    page: input.page,
    page_size: input.page_size,
    ordering: input.ordering,
    ...tat,
  };
}

export const PRICING_SUMMARY_CAPSULE_LABELS: Record<PricingSummaryCapsuleId, string> = {
  available_tests: "Available tests",
  active_packages: "Active packages",
  home_collection: "Home collection",
  hidden_tests: "Hidden tests",
  avg_tat: "Fastest TAT first",
};

export function pricingHasActiveFilters(
  filters: PricingServicesFilterState,
  searchInput: string,
): boolean {
  return (
    Boolean(searchInput.trim()) ||
    filters.availability !== "" ||
    filters.activeStatus !== "" ||
    filters.homeCollection !== "" ||
    filters.tatPreset !== ""
  );
}

export type { PricingCatalogTab };
