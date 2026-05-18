"use client";

import type { PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import { PatientGroupStatusBadges } from "@/components/labs/reports/PatientGroupStatusBadges";
import { ChevronDown, ChevronRight, Phone } from "lucide-react";

type ReportsPatientGroupHeaderProps = {
  group: PatientReportGroup;
  expanded: boolean;
  onToggle: () => void;
};

export function ReportsPatientGroupHeader({ group, expanded, onToggle }: ReportsPatientGroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg bg-[#F8F7FF] px-2 py-2 text-left transition-colors hover:bg-[#F4F1FF]"
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-[#6D4FF5]" aria-hidden />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#6D4FF5]" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111827]">{group.patientName}</span>
      {group.patientPhone ? <Phone className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden /> : null}
      <PatientGroupStatusBadges
        pendingCount={group.pendingCount}
        completedCount={group.completedCount}
      />
      <span className="shrink-0 text-[10px] text-[#9CA3AF]">{group.totalCount} report{group.totalCount === 1 ? "" : "s"}</span>
    </button>
  );
}
