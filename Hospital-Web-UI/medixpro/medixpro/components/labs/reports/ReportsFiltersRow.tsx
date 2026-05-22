"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLLECTION_TYPE_LABELS, COLLECTION_TYPES } from "@/lib/labs/constants/collection-type";
import { LAB_ORDERS_DATE_PRESET_OPTIONS } from "@/lib/labs/orders/date-presets";
import type { ReportTasksQueryFilters } from "@/lib/labs/reports/build-report-tasks-query";
import { URGENCY_LEVELS, URGENCY_LABELS } from "@/lib/labs/constants/urgency";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type ReportsFiltersRowProps = {
  searchInput: string;
  onSearchChange: (v: string) => void;
  filters: ReportTasksQueryFilters;
  onFiltersChange: (f: ReportTasksQueryFilters) => void;
  disabled?: boolean;
};

export function ReportsFiltersRow({
  searchInput,
  onSearchChange,
  filters,
  onFiltersChange,
  disabled,
}: ReportsFiltersRowProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const patch = (partial: Partial<ReportTasksQueryFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleUrgentOnly = () => patch({ urgentOnly: !filters.urgentOnly });
  const toggleTatOnly = () => patch({ tatOnly: !filters.tatOnly });

  return (
    <div className="flex min-h-[72px] flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <Label className="sr-only">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
              aria-hidden
            />
            <Input
              className="h-9 pl-9"
              placeholder="Patient, phone, order, test"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={disabled}
              aria-label="Search reports"
            />
          </div>
        </div>
        <div className="flex min-w-[140px] flex-col gap-1 sm:w-auto">
          <Label className="text-xs text-[#6B7280]">Collection</Label>
          <Select
            value={filters.collectionType}
            onValueChange={(v) => patch({ collectionType: v as ReportTasksQueryFilters["collectionType"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {COLLECTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {COLLECTION_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5 self-end">
          <Button
            type="button"
            variant={filters.urgentOnly ? "default" : "outline"}
            size="sm"
            className={cn("h-9 min-h-9 text-xs", filters.urgentOnly && "bg-[#4A2DB8] hover:bg-[#3D2499]")}
            disabled={disabled}
            onClick={toggleUrgentOnly}
            aria-pressed={filters.urgentOnly}
          >
            Urgent only
          </Button>
          <Button
            type="button"
            variant={filters.tatOnly ? "default" : "outline"}
            size="sm"
            className={cn("h-9 min-h-9 text-xs", filters.tatOnly && "bg-red-600 hover:bg-red-700")}
            disabled={disabled}
            onClick={toggleTatOnly}
            aria-pressed={filters.tatOnly}
          >
            TAT breached
          </Button>
        </div>
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 self-end"
              disabled={disabled}
            >
              More filters
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 sm:col-span-full">
            <div className="flex max-w-xs flex-col gap-1">
              <Label className="text-xs text-[#6B7280]">Date</Label>
              <Select
                value={filters.datePreset}
                onValueChange={(v) => patch({ datePreset: v as ReportTasksQueryFilters["datePreset"] })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
            <div className="mt-2 flex max-w-xs flex-col gap-1">
              <Label className="text-xs text-[#6B7280]">Urgency</Label>
              <Select
                value={filters.urgency}
                onValueChange={(v) => patch({ urgency: v as ReportTasksQueryFilters["urgency"] })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
