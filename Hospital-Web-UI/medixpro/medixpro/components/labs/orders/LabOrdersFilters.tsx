"use client";

import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { LAB_ORDERS_DATE_PRESET_OPTIONS } from "@/lib/labs/orders/date-presets";
import { PHASE1_ORDER_FILTER_STATUSES } from "@/lib/labs/constants/order-filters";
import type { LabOrdersFilterState } from "@/lib/labs/orders/build-lab-orders-query";
import { ORDER_STATUS_LABELS } from "@/lib/labs/constants/status";
import { URGENCY_LEVELS, URGENCY_LABELS } from "@/lib/labs/constants/urgency";
import { COLLECTION_TYPE_LABELS, COLLECTION_TYPES } from "@/lib/labs/constants/collection-type";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

type LabOrdersFiltersProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: LabOrdersFilterState;
  onFiltersChange: (next: LabOrdersFilterState) => void;
  disabled?: boolean;
};

export function LabOrdersFilters({
  searchInput,
  onSearchChange,
  filters,
  onFiltersChange,
  disabled,
}: LabOrdersFiltersProps) {
  const patch = (partial: Partial<LabOrdersFilterState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <LabFilterBar className="flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full min-w-[200px] flex-1 basis-full sm:basis-[280px]">
        <Label className="text-xs">Search</Label>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
          <Input
            className="h-9 pl-9"
            placeholder="Order ID, patient name, or phone"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            aria-label="Search orders"
          />
        </div>
      </div>
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <Label className="text-xs">Date</Label>
        <Select
          value={filters.datePreset}
          onValueChange={(v) => patch({ datePreset: v as LabOrdersFilterState["datePreset"] })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {LAB_ORDERS_DATE_PRESET_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <Label className="text-xs">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(v) => patch({ status: v as LabOrdersFilterState["status"] })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {PHASE1_ORDER_FILTER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <Label className="text-xs">Home / visit</Label>
        <Select
          value={filters.collectionType}
          onValueChange={(v) => patch({ collectionType: v as LabOrdersFilterState["collectionType"] })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {COLLECTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {COLLECTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1">
        <Label className="text-xs">Urgency</Label>
        <Select
          value={filters.urgency}
          onValueChange={(v) => patch({ urgency: v as LabOrdersFilterState["urgency"] })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {URGENCY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {URGENCY_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </LabFilterBar>
  );
}
