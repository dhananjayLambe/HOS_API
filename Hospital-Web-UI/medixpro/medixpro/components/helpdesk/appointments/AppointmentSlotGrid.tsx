"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Slot } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  countSlotsPerBucket,
  filterSlotsByBucket,
  getDefaultBucketForDate,
  TIME_BUCKET_ORDER,
  type TimeBucket,
} from "@/lib/helpdesk/slotTimeBuckets";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<TimeBucket, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export interface AppointmentSlotGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
  /** Selected calendar day (yyyy-MM-dd) — drives default bucket (today vs future). */
  selectedDateIso: string;
  /** Called when the active bucket no longer contains the selected slot (e.g. user switched bucket). */
  onSelectionInvalidInBucket?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  /** Shown when `slots.length === 0` (e.g. backend message for closed day / no schedule). */
  emptySlotsDescription?: string | null;
  disabled?: boolean;
  className?: string;
}

function stateStyles(state: Slot["state"], selected: boolean) {
  if (selected) {
    return "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30";
  }
  switch (state) {
    case "available":
      return "border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/20";
    case "booked":
      return "cursor-not-allowed border-rose-500/50 bg-rose-500/10 text-rose-800 line-through opacity-80 dark:text-rose-200";
    case "blocked":
      return "cursor-not-allowed border-muted-foreground/30 bg-muted/50 text-muted-foreground opacity-70";
    default:
      return "";
  }
}

export function AppointmentSlotGrid({
  slots,
  selectedSlotId,
  onSelectSlot,
  selectedDateIso,
  onSelectionInvalidInBucket,
  isLoading,
  errorMessage,
  emptySlotsDescription,
  disabled,
  className,
}: AppointmentSlotGridProps) {
  const [activeBucket, setActiveBucket] = useState<TimeBucket>(() =>
    getDefaultBucketForDate(selectedDateIso, slots)
  );
  const [bucketHint, setBucketHint] = useState(false);
  const invalidCbRef = useRef(onSelectionInvalidInBucket);
  invalidCbRef.current = onSelectionInvalidInBucket;

  useEffect(() => {
    if (slots.length === 0) return;
    setActiveBucket(getDefaultBucketForDate(selectedDateIso, slots));
  }, [slots.length, selectedDateIso]);

  const counts = useMemo(() => countSlotsPerBucket(slots), [slots]);
  const visibleSlots = useMemo(() => filterSlotsByBucket(slots, activeBucket), [slots, activeBucket]);

  const allUnavailable =
    slots.length > 0 && !slots.some((s) => s.state === "available");

  useEffect(() => {
    if (!selectedSlotId) return;
    const stillHere = filterSlotsByBucket(slots, activeBucket).some((s) => s.id === selectedSlotId);
    if (!stillHere) {
      invalidCbRef.current?.();
      setBucketHint(true);
      const t = window.setTimeout(() => setBucketHint(false), 4500);
      return () => window.clearTimeout(t);
    }
  }, [activeBucket, selectedSlotId, slots]);

  if (isLoading) {
    return (
      <div className={cn("flex min-h-[120px] items-center justify-center gap-2 py-8", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading slots…</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive",
          className
        )}
      >
        {errorMessage}
      </div>
    );
  }

  if (slots.length === 0) {
    const emptyCopy =
      emptySlotsDescription?.trim() ||
      "No slots for this selection. Pick another doctor or date.";
    return (
      <p className={cn("py-6 text-center text-sm text-muted-foreground", className)}>{emptyCopy}</p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Time</p>
        {allUnavailable && (
          <span className="text-xs text-muted-foreground">All slots taken or blocked</span>
        )}
      </div>

      <div className="-mx-1 touch-pan-x overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:thin]">
        <ToggleGroup
          type="single"
          value={activeBucket}
          onValueChange={(v) => {
            if (v) setActiveBucket(v as TimeBucket);
          }}
          variant="outline"
          className="inline-flex w-max min-w-full justify-start gap-1.5 px-1 sm:justify-center"
          aria-label="Time of day"
        >
          {TIME_BUCKET_ORDER.map((bucket) => {
            const n = counts[bucket];
            const label = `${BUCKET_LABEL[bucket]} (${n})`;
            return (
              <ToggleGroupItem
                key={bucket}
                value={bucket}
                aria-pressed={activeBucket === bucket}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-11 min-w-[5.5rem] data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                )}
              >
                {label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {bucketHint && (
        <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
          Selected time was in another period — pick a slot here or switch tab.
        </p>
      )}

      <div
        className="min-h-[120px] transition-opacity duration-200 ease-out"
        style={{ opacity: 1 }}
      >
        {visibleSlots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
            No slots available
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {visibleSlots.map((slot) => {
              const selectable = slot.state === "available" && !disabled && !allUnavailable;
              const selected = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => selectable && onSelectSlot(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-sm font-medium transition-all duration-200",
                    stateStyles(slot.state, selected),
                    selectable && "active:scale-[0.98]"
                  )}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
        </span>
        {" · "}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Booked
        </span>
        {" · "}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Blocked
        </span>
      </p>
    </div>
  );
}
