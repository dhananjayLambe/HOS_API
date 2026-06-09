"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { PrescriptionStatusFilter, WhatsAppStatusFilter } from "@/lib/api/prescriptions";

export type DatePresetId = "today" | "7d" | "30d" | "custom";

export interface PrescriptionsFilterValues {
  search: string;
  status: PrescriptionStatusFilter;
  whatsapp_status: WhatsAppStatusFilter;
  preset: DatePresetId;
  /** ISO YYYY-MM-DD inclusive lower bound. */
  date_from: string;
  /** ISO YYYY-MM-DD inclusive upper bound. */
  date_to: string;
}

interface PrescriptionsFiltersProps {
  values: PrescriptionsFilterValues;
  onChange: (next: PrescriptionsFilterValues) => void;
  onSearchSubmit?: () => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { id: PrescriptionStatusFilter; label: string; activeClass: string }[] = [
  { id: "all", label: "All", activeClass: "bg-primary text-primary-foreground hover:bg-primary/90" },
  { id: "active", label: "Active", activeClass: "bg-green-600 text-white hover:bg-green-600/90" },
  { id: "cancelled", label: "Cancelled", activeClass: "bg-red-600 text-white hover:bg-red-600/90" },
];

const WHATSAPP_STATUS_OPTIONS: { id: WhatsAppStatusFilter; label: string; activeClass: string }[] = [
  { id: "all", label: "All WhatsApp", activeClass: "bg-slate-700 text-white hover:bg-slate-700/90" },
  { id: "delivered", label: "Delivered", activeClass: "bg-emerald-600 text-white hover:bg-emerald-600/90" },
  { id: "pending", label: "Pending", activeClass: "bg-amber-500 text-white hover:bg-amber-500/90" },
  { id: "failed", label: "Failed", activeClass: "bg-red-600 text-white hover:bg-red-600/90" },
  { id: "skipped", label: "Skipped", activeClass: "bg-slate-500 text-white hover:bg-slate-500/90" },
];

const PRESET_OPTIONS: { id: DatePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

const toIso = (date: Date) => format(date, "yyyy-MM-dd");

export function rangeForPreset(preset: DatePresetId, current?: { from?: string; to?: string }): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "today":
      return { from: toIso(today), to: toIso(today) };
    case "7d": {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from: toIso(from), to: toIso(today) };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { from: toIso(from), to: toIso(today) };
    }
    case "custom":
    default:
      return {
        from: current?.from || toIso(today),
        to: current?.to || toIso(today),
      };
  }
}

export const DEFAULT_FILTERS: PrescriptionsFilterValues = (() => {
  const r = rangeForPreset("today");
  return {
    search: "",
    status: "all",
    whatsapp_status: "all",
    preset: "today",
    date_from: r.from,
    date_to: r.to,
  };
})();

const formatRangeLabel = (from?: string, to?: string) => {
  if (!from || !to) return "Pick a range";
  try {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    if (from === to) return format(fromDate, "dd MMM yyyy");
    return `${format(fromDate, "dd MMM")} – ${format(toDate, "dd MMM yyyy")}`;
  } catch {
    return "Pick a range";
  }
};

export function PrescriptionsFilters({
  values,
  onChange,
  onSearchSubmit,
  onReset,
}: PrescriptionsFiltersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => ({
    from: values.date_from ? parseISO(values.date_from) : undefined,
    to: values.date_to ? parseISO(values.date_to) : undefined,
  }));

  useEffect(() => {
    setDraftRange({
      from: values.date_from ? parseISO(values.date_from) : undefined,
      to: values.date_to ? parseISO(values.date_to) : undefined,
    });
  }, [values.date_from, values.date_to]);

  const isDirty = useMemo(() => {
    return (
      values.search.trim() !== "" ||
      values.status !== "all" ||
      values.whatsapp_status !== "all" ||
      values.preset !== "today" ||
      values.date_from !== DEFAULT_FILTERS.date_from ||
      values.date_to !== DEFAULT_FILTERS.date_to
    );
  }, [values]);

  const handleStatusChange = (status: PrescriptionStatusFilter) => {
    if (status === values.status) return;
    onChange({ ...values, status });
  };

  const handleWhatsAppStatusChange = (whatsapp_status: WhatsAppStatusFilter) => {
    if (whatsapp_status === values.whatsapp_status) return;
    onChange({ ...values, whatsapp_status });
  };

  const handlePresetChange = (preset: DatePresetId) => {
    if (preset === "custom") {
      onChange({ ...values, preset });
      setPopoverOpen(true);
      return;
    }
    const range = rangeForPreset(preset);
    onChange({ ...values, preset, date_from: range.from, date_to: range.to });
  };

  const handleApplyRange = () => {
    if (!draftRange?.from) return;
    const fromIso = toIso(draftRange.from);
    const toIsoVal = toIso(draftRange.to ?? draftRange.from);
    onChange({ ...values, preset: "custom", date_from: fromIso, date_to: toIsoVal });
    setPopoverOpen(false);
  };

  return (
    <div
      data-prescriptions-filters
      className={cn(
        "sticky top-0 z-30 -mx-3 border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4 xl:-mx-6 xl:px-6"
      )}
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_auto_auto] xl:items-center">
        <div className="relative w-full xl:max-w-[28rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            placeholder="Search by Patient Name / PNR / Mobile"
            className="h-10 pl-9"
            value={values.search}
            onChange={(event) => onChange({ ...values, search: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchSubmit?.();
              }
            }}
            aria-label="Search prescriptions"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-center">
          <div
            role="radiogroup"
            aria-label="Filter by status"
            className="inline-flex items-center rounded-full border bg-muted/60 p-1"
          >
            {STATUS_OPTIONS.map((option) => {
              const isActive = values.status === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleStatusChange(option.id)}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? option.activeClass
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div
            role="radiogroup"
            aria-label="Filter by WhatsApp delivery status"
            className="inline-flex items-center rounded-full border bg-muted/60 p-1"
          >
            {WHATSAPP_STATUS_OPTIONS.map((option) => {
              const isActive = values.whatsapp_status === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleWhatsAppStatusChange(option.id)}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? option.activeClass
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-start gap-2 xl:justify-end"
        >
          <div
            role="radiogroup"
            aria-label="Filter by date"
            className="inline-flex items-center rounded-full border bg-muted/60 p-1"
          >
            {PRESET_OPTIONS.map((option) => {
              const isActive = values.preset === option.id;
              if (option.id === "custom") {
                return (
                  <Popover key={option.id} open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => handlePresetChange("custom")}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {isActive ? formatRangeLabel(values.date_from, values.date_to) : "Custom"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="end">
                      <Calendar
                        mode="range"
                        numberOfMonths={2}
                        selected={draftRange}
                        onSelect={setDraftRange}
                        defaultMonth={draftRange?.from}
                        initialFocus
                      />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {draftRange?.from
                            ? formatRangeLabel(
                                toIso(draftRange.from),
                                toIso(draftRange.to ?? draftRange.from)
                              )
                            : "Pick a start date"}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPopoverOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyRange}
                            disabled={!draftRange?.from}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handlePresetChange(option.id)}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {isDirty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="min-h-9"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset Filters
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
