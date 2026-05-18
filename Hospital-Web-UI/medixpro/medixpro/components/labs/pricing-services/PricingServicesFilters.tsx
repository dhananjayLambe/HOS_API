"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  PricingActiveFilter,
  PricingAvailabilityFilter,
  PricingHomeCollectionFilter,
  PricingServicesFilterState,
  PricingTatPreset,
} from "@/lib/labs/pricing-services/build-pricing-services-query";
import { pricingHasActiveFilters } from "@/lib/labs/pricing-services/build-pricing-services-query";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { KeyboardEvent } from "react";

type SegmentOption<T extends string> = { id: T; label: string };

function FilterSegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <Button
            key={opt.id || `all-${label}`}
            type="button"
            size="sm"
            variant={value === opt.id ? "secondary" : "ghost"}
            className={cn(
              "h-7 px-2.5 text-xs",
              value === opt.id && "bg-[#EDE9FE] text-[#5B21B6] hover:bg-[#EDE9FE]",
            )}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const AVAILABILITY: SegmentOption<PricingAvailabilityFilter>[] = [
  { id: "", label: "All" },
  { id: "available", label: "Available" },
  { id: "unavailable", label: "Hidden" },
];

const FULFILLMENT: SegmentOption<PricingHomeCollectionFilter>[] = [
  { id: "", label: "All" },
  { id: "true", label: "Home collection" },
  { id: "false", label: "Lab only" },
];

const STATUS: SegmentOption<PricingActiveFilter>[] = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const TAT: SegmentOption<PricingTatPreset>[] = [
  { id: "", label: "Any" },
  { id: "fast", label: "≤12h" },
  { id: "standard", label: "13–24h" },
  { id: "extended", label: "25h+" },
];

type Props = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: PricingServicesFilterState;
  onFiltersChange: (next: PricingServicesFilterState) => void;
  onClearFilters: () => void;
  disabled?: boolean;
};

export function PricingServicesFilters({
  searchInput,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
  disabled,
}: Props) {
  const hasFilters = pricingHasActiveFilters(filters, searchInput);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onSearchChange("");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D4FF5]"
            aria-hidden
          />
          <Input
            className="h-10 border-[#D8D2F8] bg-white pl-10 text-sm shadow-sm placeholder:text-[#6B7280] focus-visible:ring-[#7C5CFC]/30"
            placeholder="Search test, package, code, or category"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            disabled={disabled}
            aria-label="Search catalog"
          />
        </div>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 self-end text-xs text-[#6B7280] hover:text-[#111827] sm:self-center"
            onClick={onClearFilters}
            disabled={disabled}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSegmentGroup
          label="Availability"
          options={AVAILABILITY}
          value={filters.availability}
          onChange={(id) => onFiltersChange({ ...filters, availability: id })}
          disabled={disabled}
        />
        <FilterSegmentGroup
          label="Fulfillment"
          options={FULFILLMENT}
          value={filters.homeCollection}
          onChange={(id) => onFiltersChange({ ...filters, homeCollection: id })}
          disabled={disabled}
        />
        <FilterSegmentGroup
          label="Status"
          options={STATUS}
          value={filters.activeStatus}
          onChange={(id) => onFiltersChange({ ...filters, activeStatus: id })}
          disabled={disabled}
        />
        <FilterSegmentGroup
          label="TAT"
          options={TAT}
          value={filters.tatPreset}
          onChange={(id) => onFiltersChange({ ...filters, tatPreset: id })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
