"use client";

import { cn } from "@/lib/utils";

type ClinicalFilterChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function ClinicalFilterChip({
  label,
  active,
  onClick,
  className,
}: ClinicalFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] text-[hsl(var(--clinical-text-primary))] hover:bg-[hsl(var(--clinical-surface-interactive))]",
        className
      )}
    >
      {label}
    </button>
  );
}
