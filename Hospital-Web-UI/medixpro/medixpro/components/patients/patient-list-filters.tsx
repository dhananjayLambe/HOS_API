"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientListFilter } from "@/lib/api/patients";

const FILTERS: Array<{ key: PatientListFilter; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "today", label: "Today" },
  { key: "follow_up_due", label: "Follow-up Due" },
  { key: "has_active_rx", label: "Has Active Prescription" },
];

interface Props {
  filter: PatientListFilter;
  onChange: (filter: PatientListFilter) => void;
  onReset: () => void;
}

export function PatientListFilters({ filter, onChange, onReset }: Props) {
  const hasActive = filter !== "recent";
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
      {FILTERS.map((option) => (
        <Button
          key={option.key}
          type="button"
          variant="outline"
          className={cn(
            "h-8 shrink-0 rounded-full px-3 text-xs",
            filter === option.key && "border-primary bg-primary/10 text-primary",
          )}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </Button>
      ))}
      {hasActive && (
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onReset}>
          Reset Filters
        </Button>
      )}
    </div>
  );
}
