"use client";

import { AppointmentDetailSheet } from "@/components/labs/visit-appointments/AppointmentDetailSheet";
import { VisitAppointmentsFilters } from "@/components/labs/visit-appointments/VisitAppointmentsFilters";
import { VisitAppointmentsSummaryCards } from "@/components/labs/visit-appointments/VisitAppointmentsSummaryCards";
import { VisitAppointmentsSummaryCardsSkeleton } from "@/components/labs/visit-appointments/VisitAppointmentsSummaryCardsSkeleton";
import { VisitAppointmentsTable } from "@/components/labs/visit-appointments/VisitAppointmentsTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { LabOrdersPagination } from "@/components/labs/orders/LabOrdersPagination";
import { LabOrdersTableSkeleton } from "@/components/labs/orders/LabOrdersTableSkeleton";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { Button } from "@/components/ui/button";
import { useLabVisitAppointmentsList } from "@/hooks/labs/useLabVisitAppointmentsList";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  checkInVisitAppointment,
  completeVisitAppointment,
  confirmVisitAppointment,
  markNoShowVisitAppointment,
} from "@/lib/labs/api/visit-appointments";
import type { VisitAppointmentWorkflowResponse } from "@/lib/labs/api/visit-appointments-types";
import { patchRowFromWorkflow } from "@/lib/labs/visit-appointments/map-appointment-row";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import type { LabAppointmentRow } from "@/lib/labs/types";
import { Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_MESSAGES: Record<string, { title: string; description: string }> = {
  scheduled: {
    title: "No scheduled visit appointments",
    description: "Walk-in and imaging appointments awaiting confirmation will appear here.",
  },
  confirmed: {
    title: "No confirmed appointments",
    description: "Confirmed visits ready for patient check-in will show here.",
  },
  checked_in: {
    title: "No checked-in appointments",
    description: "Patients currently at the facility will appear here.",
  },
  completed: {
    title: "No completed visits today",
    description: "Completed branch visits for the selected date range.",
  },
  failed: {
    title: "No failed or no-show appointments",
    description: "No-shows and cancellations for the selected filters.",
  },
};

export function LabVisitAppointmentsPage() {
  const { data: session } = useLabSession();
  const toast = useToastNotification();
  const branchLabel = session?.branch?.branch_name ?? "";

  const {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    rows,
    total,
    totalPages,
    summary,
    loading,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton,
  } = useLabVisitAppointmentsList();

  const [rowPatches, setRowPatches] = useState<Record<string, LabAppointmentRow>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setRowPatches({});
  }, [rows]);

  const displayRows = useMemo(
    () => rows.map((r) => rowPatches[r.id] ?? r),
    [rows, rowPatches],
  );

  const selectedRow = useMemo(
    () => displayRows.find((r) => r.id === selectedId) ?? null,
    [displayRows, selectedId],
  );

  const applyWorkflowPatch = useCallback(
    (row: LabAppointmentRow, res: VisitAppointmentWorkflowResponse) => {
      const patched = patchRowFromWorkflow(row, res);
      setRowPatches((prev) => ({ ...prev, [row.id]: patched }));
      toast.success(res.message);
      refetch();
    },
    [refetch, toast],
  );

  const runAction = useCallback(
    async (row: LabAppointmentRow, fn: () => Promise<VisitAppointmentWorkflowResponse>) => {
      setBusyId(row.id);
      try {
        const res = await fn();
        applyWorkflowPatch(row, res);
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { detail?: string } }; message?: string };
        toast.error(ax?.response?.data?.detail || ax?.message || "Action failed.");
      } finally {
        setBusyId(null);
      }
    },
    [applyWorkflowPatch, toast],
  );

  const openDetail = (row: LabAppointmentRow) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  };

  const headerActions = useMemo(
    () => (
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={loading}>
        <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </Button>
    ),
    [loading, refetch],
  );

  useLabShellHeader({
    title: "Visit Appointments",
    description: branchLabel
      ? `${branchLabel} — facility visits, imaging, and walk-in operational queue.`
      : "Facility visits, imaging, and walk-in operational queue.",
    actions: headerActions,
  });

  const emptyCopy = EMPTY_MESSAGES[filters.statusTab] ?? {
    title: "No appointments in this view",
    description: "Adjust filters or refresh the queue.",
  };

  const showTable = !error && !showInitialSkeleton && displayRows.length > 0;
  const showEmpty = !error && !showInitialSkeleton && !loading && displayRows.length === 0;

  const handleSummaryTabSelect = useCallback(
    (tab: typeof filters.statusTab) => {
      setFilters((prev) => ({ ...prev, statusTab: tab }));
    },
    [setFilters],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {showInitialSkeleton ? (
        <VisitAppointmentsSummaryCardsSkeleton />
      ) : (
        <VisitAppointmentsSummaryCards
          summary={summary}
          activeTab={filters.statusTab}
          onTabSelect={handleSummaryTabSelect}
        />
      )}

      <VisitAppointmentsFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        onFiltersChange={setFilters}
        disabled={showInitialSkeleton}
      />

      <SectionCard title="Appointments queue" subtitle="Row opens detail drawer — actions do not propagate.">
        {showInitialSkeleton ? (
          <LabOrdersTableSkeleton />
        ) : error ? (
          <div className="p-4">
            <LabOrdersErrorState message={error} onRetry={refetch} retrying={loading} />
          </div>
        ) : showEmpty ? (
          <div className="p-4">
            <LabEmptyState
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="secondary" className="h-9" onClick={resetFilters}>
                    Clear filters
                  </Button>
                  <Button type="button" variant="outline" className="h-9" onClick={() => refetch()}>
                    Refresh
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center gap-2 border-b border-[#ECEBFF] px-4 py-2 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading appointments…
              </div>
            ) : null}
            {showTable ? (
              <VisitAppointmentsTable
                rows={displayRows}
                busyId={busyId}
                onRowOpen={openDetail}
                onConfirm={(row) => void runAction(row, () => confirmVisitAppointment(row.id))}
                onCheckIn={(row) => void runAction(row, () => checkInVisitAppointment(row.id))}
                onComplete={(row) => void runAction(row, () => completeVisitAppointment(row.id))}
                onMarkNoShow={(row) => {
                  const reason = window.prompt("No-show reason (optional):") ?? "";
                  void runAction(row, () => markNoShowVisitAppointment(row.id, reason));
                }}
              />
            ) : null}
            {showTable ? (
              <LabOrdersPagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                pageSizeOptions={pageSizeOptions}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                disabled={loading}
              />
            ) : null}
          </>
        )}
      </SectionCard>

      <AppointmentDetailSheet
        row={selectedRow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        busy={busyId === selectedRow?.id}
        onConfirm={(row) => void runAction(row, () => confirmVisitAppointment(row.id))}
        onCheckIn={(row) => void runAction(row, () => checkInVisitAppointment(row.id))}
        onComplete={(row) => void runAction(row, () => completeVisitAppointment(row.id))}
        onMarkNoShow={(row) => {
          const reason = window.prompt("No-show reason (optional):") ?? "";
          void runAction(row, () => markNoShowVisitAppointment(row.id, reason));
        }}
      />
    </div>
  );
}
