"use client";

import { ClinicalFilterChip } from "@/components/clinical";
import type { QuickClinicalFilter } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

const FILTERS: { id: QuickClinicalFilter; label: string }[] = [
  { id: "my_patients", label: "My Patients" },
  { id: "reports_ready", label: "Reports Ready" },
  { id: "awaiting", label: "Awaiting Results" },
  { id: "today", label: "Uploaded Today" },
];

type QuickClinicalFiltersProps = {
  active: QuickClinicalFilter | null;
  onSelect: (filter: QuickClinicalFilter | null) => void;
};

export function QuickClinicalFilters({ active, onSelect }: QuickClinicalFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--clinical-text-meta))]">
        Quick filters
      </span>
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <ClinicalFilterChip
            key={f.id}
            label={f.label}
            active={isActive}
            onClick={() => onSelect(isActive ? null : f.id)}
          />
        );
      })}
    </div>
  );
}
