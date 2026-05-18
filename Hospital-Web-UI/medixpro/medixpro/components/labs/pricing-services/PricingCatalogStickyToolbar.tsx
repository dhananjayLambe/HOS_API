"use client";

import { PricingServicesFilters } from "@/components/labs/pricing-services/PricingServicesFilters";
import { PricingServicesTabs } from "@/components/labs/pricing-services/PricingServicesTabs";
import type { PricingCatalogTab } from "@/lib/labs/api/pricing-services-types";
import type { PricingServicesFilterState } from "@/lib/labs/pricing-services/build-pricing-services-query";
import { cn } from "@/lib/utils";

type Props = {
  catalogTab: PricingCatalogTab;
  onCatalogTabChange: (tab: PricingCatalogTab) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: PricingServicesFilterState;
  onFiltersChange: (next: PricingServicesFilterState) => void;
  onClearFilters: () => void;
  disabled?: boolean;
  className?: string;
};

export function PricingCatalogStickyToolbar({
  catalogTab,
  onCatalogTabChange,
  searchInput,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
  disabled,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-1 border-b border-[#ECEBFF] bg-white/95 px-1 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90",
        className,
      )}
    >
      <div className="space-y-2">
        <PricingServicesTabs
          catalogTab={catalogTab}
          onCatalogTabChange={onCatalogTabChange}
          disabled={disabled}
        />
        <PricingServicesFilters
          searchInput={searchInput}
          onSearchChange={onSearchChange}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearFilters={onClearFilters}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
