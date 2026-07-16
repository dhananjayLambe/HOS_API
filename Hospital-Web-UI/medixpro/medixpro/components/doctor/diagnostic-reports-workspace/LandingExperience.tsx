"use client";

import { PatientSearchBar } from "@/components/doctor/diagnostic-reports-workspace/PatientSearchBar";
import { OperationalQueueStrip } from "@/components/doctor/diagnostic-reports-workspace/OperationalQueueStrip";
import { QuickClinicalFilters } from "@/components/doctor/diagnostic-reports-workspace/QuickClinicalFilters";
import { WorkspaceAdvancedFilters } from "@/components/doctor/diagnostic-reports-workspace/WorkspaceAdvancedFilters";
import type {
  AdvancedWorkspaceFilters,
  OperationalQueue,
  OperationalQueueCounts,
  QuickClinicalFilter,
  WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

type LandingExperienceProps = {
  search: string;
  onSearchChange: (value: string) => void;
  myPatientsActive: boolean;
  onMyPatients: () => void;
  queueCounts: OperationalQueueCounts;
  activeQueue: OperationalQueue | null;
  onQueueSelect: (queue: OperationalQueue | null) => void;
  queuesLoading?: boolean;
  quickFilter: QuickClinicalFilter | null;
  onQuickFilterSelect: (filter: QuickClinicalFilter | null) => void;
  advanced: AdvancedWorkspaceFilters;
  onAdvancedChange: (next: AdvancedWorkspaceFilters) => void;
  filterOptionsReports: WorkspaceReport[];
};

export function LandingExperience({
  search,
  onSearchChange,
  myPatientsActive,
  onMyPatients,
  queueCounts,
  activeQueue,
  onQueueSelect,
  queuesLoading,
  quickFilter,
  onQuickFilterSelect,
  advanced,
  onAdvancedChange,
  filterOptionsReports,
}: LandingExperienceProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <PatientSearchBar
          value={search}
          onChange={onSearchChange}
          myPatientsActive={myPatientsActive}
          onMyPatients={onMyPatients}
          className="min-w-0 flex-1"
        />
        <WorkspaceAdvancedFilters
          value={advanced}
          onChange={onAdvancedChange}
          reportsForOptions={filterOptionsReports}
        />
      </div>

      <OperationalQueueStrip
        counts={queueCounts}
        active={activeQueue}
        onSelect={onQueueSelect}
        loading={queuesLoading}
      />

      <QuickClinicalFilters active={quickFilter} onSelect={onQuickFilterSelect} />
    </div>
  );
}
