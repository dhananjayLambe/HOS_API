"use client";

import { cn } from "@/lib/utils";
import { CLINICAL_MODALITY_OPTIONS, type ClinicalModality } from "@/lib/doctor/diagnostic-reports-workspace/clinical-modality";

type ClinicalModalityChipsProps = {
  value: ClinicalModality | null;
  onChange: (next: ClinicalModality | null) => void;
  className?: string;
};

export function ClinicalModalityChips({
  value,
  onChange,
  className,
}: ClinicalModalityChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
      aria-label="Filter by report category"
    >
      {CLINICAL_MODALITY_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] text-[hsl(var(--clinical-text-secondary))] hover:border-primary/40 hover:text-[hsl(var(--clinical-text-primary))]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
