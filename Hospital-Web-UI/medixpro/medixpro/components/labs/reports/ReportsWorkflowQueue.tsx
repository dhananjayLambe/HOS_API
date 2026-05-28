"use client";

import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { ReportsWorkflowGroup } from "@/components/labs/reports/ReportsWorkflowGroup";
import { ReportsWorkflowSkeleton } from "@/components/labs/reports/ReportsWorkflowSkeleton";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import {
  defaultGroupsExpanded,
  type PatientReportGroup,
} from "@/lib/labs/reports/group-report-tasks";
import {
  resolveQueueEmptyState,
  type QueueEmptyStateResolved,
} from "@/lib/labs/reports/report-queue-empty-state";
import type { ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import type { ReportsAssignmentLiveCardActions } from "@/components/labs/reports/ReportsAssignmentLiveCard";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReportsWorkflowQueueProps = {
  groups: PatientReportGroup[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  isQueryError: boolean;
  totalTaskCount: number;
  filteredTaskCount: number;
  tab: ReportTabKey;
  searchQuery: string;
  onClearSearch?: () => void;
  actionLoading?: string | null;
  onRetry: () => void;
  onPrimaryAction: (task: ReportTask, actionKey: string) => void;
  onPreview: (task: ReportTask) => void;
  onViewOrder: (task: ReportTask) => void;
  liveCardActions?: ReportsAssignmentLiveCardActions;
};

function QueueEmptyPanel({
  state,
  onRetry,
  retrying,
  onClearSearch,
}: {
  state: QueueEmptyStateResolved;
  onRetry?: () => void;
  retrying?: boolean;
  onClearSearch?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#ECEBFF] bg-white px-4 py-8 text-center">
      <p className="text-sm font-semibold text-[#111827]">{state.title}</p>
      {state.description ? (
        <p className="mt-1 text-sm text-[#6B7280]">{state.description}</p>
      ) : null}
      {state.kind === "load_error" && onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry} disabled={retrying}>
          Retry
        </Button>
      ) : null}
      {state.kind === "search_empty" && onClearSearch ? (
        <Button type="button" variant="link" size="sm" className="mt-2" onClick={onClearSearch}>
          Clear search
        </Button>
      ) : null}
    </div>
  );
}

export function ReportsWorkflowQueue({
  groups,
  loading,
  refreshing = false,
  error,
  isQueryError,
  totalTaskCount,
  filteredTaskCount,
  tab,
  searchQuery,
  onClearSearch,
  actionLoading,
  onRetry,
  onPrimaryAction,
  onPreview,
  onViewOrder,
  liveCardActions,
}: ReportsWorkflowQueueProps) {
  const isMobile = useMobile();
  const defaultExpanded = defaultGroupsExpanded(groups.length, isMobile);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const useStickyHeaders = expandedKeys.size <= 3;
  const knownKeysRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const patientKeys = useMemo(() => groups.map((g) => g.patientKey), [groups]);

  useEffect(() => {
    if (patientKeys.length === 0) return;

    setExpandedKeys((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const key of patientKeys) {
        if (!knownKeysRef.current.has(key)) {
          knownKeysRef.current.add(key);
          if (!initializedRef.current && defaultExpanded) {
            next.add(key);
            changed = true;
          }
        }
      }

      if (!initializedRef.current) {
        initializedRef.current = true;
        if (defaultExpanded) {
          for (const key of patientKeys) {
            if (!next.has(key)) {
              next.add(key);
              changed = true;
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [patientKeys, defaultExpanded]);

  const toggleGroup = useCallback((patientKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(patientKey)) next.delete(patientKey);
      else next.add(patientKey);
      return next;
    });
  }, []);

  const emptyState = useMemo(
    () =>
      resolveQueueEmptyState({
        isError: isQueryError || !!error,
        totalTaskCount,
        filteredTaskCount,
        tab,
        searchQuery,
      }),
    [isQueryError, error, totalTaskCount, filteredTaskCount, tab, searchQuery],
  );

  if (loading && groups.length === 0 && totalTaskCount === 0) {
    return <ReportsWorkflowSkeleton />;
  }

  if (emptyState && (isQueryError || error || filteredTaskCount === 0)) {
    if (emptyState.kind === "load_error") {
      return (
        <div className="rounded-xl border border-[#ECEBFF] bg-white p-4">
          <LabOrdersErrorState message={error ?? emptyState.title} onRetry={onRetry} retrying={loading} />
        </div>
      );
    }
    return (
      <QueueEmptyPanel
        state={emptyState}
        onRetry={onRetry}
        retrying={loading}
        onClearSearch={onClearSearch}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden transition-opacity",
        refreshing && groups.length > 0 && "opacity-90",
      )}
      aria-busy={refreshing}
      aria-live="polite"
    >
      <div className="space-y-2">
        {groups.map((group) => (
          <ReportsWorkflowGroup
            key={group.patientKey}
            group={group}
            expanded={expandedKeys.has(group.patientKey)}
            onToggle={() => toggleGroup(group.patientKey)}
            stickyTopClass={useStickyHeaders ? "sticky top-0 z-[1]" : undefined}
            actionLoading={actionLoading}
            onPrimaryAction={onPrimaryAction}
            onPreview={onPreview}
            onViewOrder={onViewOrder}
            liveCardActions={liveCardActions}
          />
        ))}
      </div>
    </div>
  );
}
