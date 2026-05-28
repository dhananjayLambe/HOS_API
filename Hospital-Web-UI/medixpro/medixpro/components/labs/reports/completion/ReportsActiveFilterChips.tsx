"use client";

import type { ActiveFilterChip } from "@/lib/labs/reports/completion/reports-queue-filters";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ReportsActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClear: (chipId: string) => void;
};

export function ReportsActiveFilterChips({ chips, onClear }: ReportsActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[#D8D2FF] bg-[#F3F1FF]/80 px-2.5 py-2"
      aria-label="Active filters"
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#5B3FD9]">Active filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onClear(chip.id)}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-full border border-[#7C5CFC] bg-white px-2.5 py-1",
            "text-xs font-semibold text-[#5B3FD9] shadow-sm hover:bg-[#EDE9FF]",
          )}
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}
    </div>
  );
}
