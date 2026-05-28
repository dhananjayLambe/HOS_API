"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  datePresetLabel,
  type ReportsDatePreset,
  type ReportsQueueFilterState,
  workflowFilterLabel,
} from "@/lib/labs/reports/completion/reports-queue-filters";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const WORKFLOW_OPTIONS: CompletionFilterKey[] = ["all", "pending", "ready", "delivered", "failed"];

const DATE_OPTIONS: ReportsDatePreset[] = ["today", "yesterday", "week", "month", "custom"];

export type ReportsOperationalFilterBarProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filterState: ReportsQueueFilterState;
  onPatchFilters: (patch: Partial<ReportsQueueFilterState>) => void;
  disabled?: boolean;
};

export function ReportsOperationalFilterBar({
  searchInput,
  onSearchChange,
  filterState,
  onPatchFilters,
  disabled,
}: ReportsOperationalFilterBarProps) {
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 border-b border-[#E5E7EB] bg-[#FAFAFA]/95 px-1 py-2 shadow-sm backdrop-blur-sm">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#9CA3AF]" aria-hidden />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          placeholder="Search patient, phone, order, or test"
          className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          aria-label="Search patient, phone, order, or test"
        />
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
          <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
            Workflow
          </Label>
          <Select
            value={filterState.workflow}
            onValueChange={(v) => onPatchFilters({ workflow: v as CompletionFilterKey })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue>{workflowFilterLabel(filterState.workflow)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {workflowFilterLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
          <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
            Date
          </Label>
          <Select
            value={filterState.datePreset}
            onValueChange={(v) =>
              onPatchFilters({
                datePreset: v as ReportsDatePreset,
                ...(v !== "custom" ? { customFrom: undefined, customTo: undefined } : {}),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue>{datePresetLabel(filterState.datePreset)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {datePresetLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filterState.datePreset === "custom" ? (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                From
              </Label>
              <Input
                type="date"
                className="h-9 w-[140px] bg-white"
                value={filterState.customFrom ?? ""}
                onChange={(e) => onPatchFilters({ customFrom: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                To
              </Label>
              <Input
                type="date"
                className="h-9 w-[140px] bg-white"
                value={filterState.customTo ?? ""}
                onChange={(e) => onPatchFilters({ customTo: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 pb-0.5">
          <FilterToggle
            label="Urgent"
            pressed={filterState.urgentOnly}
            onClick={() => onPatchFilters({ urgentOnly: !filterState.urgentOnly })}
            disabled={disabled}
          />
          <FilterToggle
            label="TAT"
            pressed={filterState.tatBreachedOnly}
            onClick={() => onPatchFilters({ tatBreachedOnly: !filterState.tatBreachedOnly })}
            disabled={disabled}
          />
          <FilterToggle
            label="TAT < 30m"
            pressed={filterState.tatSoonOnly}
            onClick={() => onPatchFilters({ tatSoonOnly: !filterState.tatSoonOnly })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

function FilterToggle({
  label,
  pressed,
  onClick,
  disabled,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={pressed ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-9 min-h-9 text-xs",
        pressed && "bg-[#7C5CFC] hover:bg-[#6B4CE0]",
      )}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={pressed}
    >
      {label}
    </Button>
  );
}
