"use client";

import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { ReportsWorkflowPatientCard } from "@/components/labs/reports/ReportsWorkflowPatientCard";
import { ReportsWorkflowSkeleton } from "@/components/labs/reports/ReportsWorkflowSkeleton";
import { useMobile } from "@/hooks/use-mobile";
import {
  defaultGroupsExpanded,
  type PatientReportGroup,
} from "@/lib/labs/reports/group-report-tasks";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReportsWorkflowQueueProps = {
  groups: PatientReportGroup[];
  loading: boolean;
  error: string | null;
  filteredEmpty: boolean;
  actionLoading?: string | null;
  onRetry: () => void;
  onPrimaryAction: (task: ReportTask, actionKey: string) => void;
  onPreview: (task: ReportTask) => void;
  onViewOrder: (task: ReportTask) => void;
};

export function ReportsWorkflowQueue({
  groups,
  loading,
  error,
  filteredEmpty,
  actionLoading,
  onRetry,
  onPrimaryAction,
  onPreview,
  onViewOrder,
}: ReportsWorkflowQueueProps) {
  const isMobile = useMobile();
  const defaultExpanded = defaultGroupsExpanded(groups.length, isMobile);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const groupKeySignature = useMemo(
    () => groups.map((g) => g.patientKey).join("\0"),
    [groups],
  );

  useEffect(() => {
    if (loading) return;
    const patientKeys = groupKeySignature.length > 0 ? groupKeySignature.split("\0") : [];
    const next = defaultExpanded ? new Set(patientKeys) : new Set<string>();
    setExpandedKeys((prev) => {
      if (prev.size === next.size && [...next].every((key) => prev.has(key))) {
        return prev;
      }
      return next;
    });
  }, [groupKeySignature, defaultExpanded, loading]);

  const toggleGroup = useCallback((patientKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(patientKey)) next.delete(patientKey);
      else next.add(patientKey);
      return next;
    });
  }, []);

  if (loading && groups.length === 0) {
    return <ReportsWorkflowSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#ECEBFF] bg-white p-4">
        <LabOrdersErrorState message={error} onRetry={onRetry} retrying={loading} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      {filteredEmpty ? (
        <p className="py-6 text-center text-sm text-[#6B7280]">No tasks match this filter.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <ReportsWorkflowPatientCard
              key={group.patientKey}
              group={group}
              expanded={expandedKeys.has(group.patientKey)}
              onToggle={() => toggleGroup(group.patientKey)}
              stickyTopClass="sticky top-0 z-[1]"
              actionLoading={actionLoading}
              onPrimaryAction={onPrimaryAction}
              onPreview={onPreview}
              onViewOrder={onViewOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
