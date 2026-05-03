"use client";

import { addDays, format, isAfter, isBefore, startOfDay } from "date-fns";

import { HELPBOOK_MAX_BOOKING_DAYS } from "@/lib/helpdesk/bookingCalendarLimits";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AppointmentDateStripProps {
  /** yyyy-MM-dd */
  selectedDate: string;
  onSelectDate: (isoDate: string) => void;
  disabled?: boolean;
  className?: string;
}

const stripDays = 7;

/** Parse calendar yyyy-MM-dd in local time (avoids UTC off-by-one). */
function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function AppointmentDateStrip({
  selectedDate,
  onSelectDate,
  disabled,
  className,
}: AppointmentDateStripProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const base = new Date();
  const todayStart = startOfDay(base);
  const lastBookableDay = startOfDay(addDays(todayStart, HELPBOOK_MAX_BOOKING_DAYS));
  const chips = Array.from({ length: stripDays }, (_, i) => {
    const d = addDays(base, i);
    const iso = format(d, "yyyy-MM-dd");
    const isToday = i === 0;
    const isTomorrow = i === 1;
    let label: string;
    if (isToday) label = "Today";
    else if (isTomorrow) label = "Tmrw";
    else label = format(d, "EEE");
    return { iso, d, label, sub: format(d, "d MMM") };
  });

  const selectedAsDate = useMemo(() => parseIsoLocal(selectedDate), [selectedDate]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm font-medium text-foreground">Date</p>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "min-h-11 w-full justify-between gap-2 text-left font-normal sm:w-auto sm:min-w-[13.5rem]",
                disabled && "pointer-events-none opacity-50"
              )}
              aria-label="Open calendar to pick a date"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{format(selectedAsDate, "EEE, d MMM yyyy")}</span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedAsDate}
              onSelect={(d) => {
                if (d) {
                  onSelectDate(format(d, "yyyy-MM-dd"));
                  setPickerOpen(false);
                }
              }}
              defaultMonth={selectedAsDate}
              initialFocus
              disabled={(date) => {
                const d = startOfDay(date);
                return isBefore(d, todayStart) || isAfter(d, lastBookableDay);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin] touch-pan-x">
        {chips.map(({ iso, d, label, sub }) => {
          const selected = selectedDate === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(iso)}
              className={cn(
                "flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-center transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-foreground hover:bg-muted/60",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <span className="text-xs font-semibold leading-tight">{label}</span>
              <span className="text-[11px] text-muted-foreground">{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
