"use client";

import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HOME_COLLECTIONS_DATE_OPTIONS,
  HOME_COLLECTIONS_TAB_OPTIONS,
  type HomeCollectionsFilterState,
} from "@/lib/labs/home-collections/build-home-collections-query";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Props = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: HomeCollectionsFilterState;
  onFiltersChange: (next: HomeCollectionsFilterState) => void;
  disabled?: boolean;
};

export function HomeCollectionsFilters({
  searchInput,
  onSearchChange,
  filters,
  onFiltersChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <LabFilterBar className="flex-wrap gap-2">
        {HOME_COLLECTIONS_TAB_OPTIONS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={filters.statusTab === tab.id ? "default" : "outline"}
            className="h-9"
            disabled={disabled}
            onClick={() => onFiltersChange({ ...filters, statusTab: tab.id })}
          >
            {tab.label}
          </Button>
        ))}
      </LabFilterBar>
      <LabFilterBar className="flex-col items-stretch gap-4 sm:flex-row sm:items-end">
        <div className="w-full min-w-[200px] flex-1 sm:max-w-xs">
          <Label className="text-xs">Search</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
            <Input
              className="h-9 pl-9"
              placeholder="Patient, phone, order ID"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Label className="sr-only">Date</Label>
          {HOME_COLLECTIONS_DATE_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={filters.datePreset === opt.id ? "secondary" : "outline"}
              className={cn("h-9")}
              disabled={disabled}
              onClick={() => onFiltersChange({ ...filters, datePreset: opt.id })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </LabFilterBar>
    </div>
  );
}
