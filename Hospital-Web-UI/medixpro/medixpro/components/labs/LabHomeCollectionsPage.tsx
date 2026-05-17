"use client";

import { AssignCollectionDialog } from "@/components/labs/home-collections/AssignCollectionDialog";
import { CollectionDetailSheet } from "@/components/labs/home-collections/CollectionDetailSheet";
import { HomeCollectionsFilters } from "@/components/labs/home-collections/HomeCollectionsFilters";
import { HomeCollectionsSummaryCards } from "@/components/labs/home-collections/HomeCollectionsSummaryCards";
import { HomeCollectionsSummaryCardsSkeleton } from "@/components/labs/home-collections/HomeCollectionsSummaryCardsSkeleton";
import { HomeCollectionsTable } from "@/components/labs/home-collections/HomeCollectionsTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { LabOrdersPagination } from "@/components/labs/orders/LabOrdersPagination";
import { LabOrdersTableSkeleton } from "@/components/labs/orders/LabOrdersTableSkeleton";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { Button } from "@/components/ui/button";
import { useLabHomeCollectionsList } from "@/hooks/labs/useLabHomeCollectionsList";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  assignHomeCollection,
  collectHomeCollection,
  failHomeCollection,
  retryHomeCollection,
  startHomeCollection,
} from "@/lib/labs/api/home-collections";
import { patchRowFromWorkflow } from "@/lib/labs/home-collections/map-collection-row";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import type { LabCollectionRow } from "@/lib/labs/types";
import { Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_MESSAGES: Record<string, { title: string; description: string }> = {
  pending: {
    title: "No pending home collections",
    description: "Accepted home orders awaiting assignment will appear here.",
  },
  assigned: {
    title: "No assigned collections",
    description: "Assigned collections ready to start will show here.",
  },
  active: {
    title: "No in-progress collections",
    description: "Collections currently in the field will show here.",
  },
  collected: {
    title: "No collected requests today",
    description: "Completed home collections for the selected date range.",
  },
  failed: {
    title: "No failed collections",
    description: "Unsuccessful collection attempts for the selected filters.",
  },
};

export function LabHomeCollectionsPage() {
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
  } = useLabHomeCollectionsList();

  const [rowPatches, setRowPatches] = useState<Record<string, LabCollectionRow>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<LabCollectionRow | null>(null);

  // Server list is source of truth after refetch; drop stale optimistic patches.
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
    (row: LabCollectionRow, res: Awaited<ReturnType<typeof startHomeCollection>>) => {
      const patched = patchRowFromWorkflow(row, res);
      setRowPatches((prev) => ({ ...prev, [row.id]: patched }));
      toast.success(res.message);
      refetch();
    },
    [refetch, toast],
  );

  const runAction = useCallback(
    async (row: LabCollectionRow, fn: () => Promise<Awaited<ReturnType<typeof startHomeCollection>>>) => {
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

  const openDetail = (row: LabCollectionRow) => {
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
    title: "Home Collections",
    description: branchLabel
      ? `${branchLabel} — operational queue for home sample collection requests.`
      : "Operational queue for home sample collection requests.",
    actions: headerActions,
  });

  const emptyCopy = EMPTY_MESSAGES[filters.statusTab] ?? {
    title: "No collections in this view",
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
        <HomeCollectionsSummaryCardsSkeleton />
      ) : (
        <HomeCollectionsSummaryCards
          summary={summary}
          activeTab={filters.statusTab}
          onTabSelect={handleSummaryTabSelect}
        />
      )}

      <HomeCollectionsFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        onFiltersChange={setFilters}
        disabled={showInitialSkeleton}
      />

      <SectionCard title="Collections queue" subtitle="Row opens detail drawer — actions do not propagate.">
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
                Loading collections…
              </div>
            ) : null}
            {showTable ? (
              <HomeCollectionsTable
                rows={displayRows}
                busyId={busyId}
                onRowOpen={openDetail}
                onAssign={(row) => setAssignTarget(row)}
                onStart={(row) => void runAction(row, () => startHomeCollection(row.id))}
                onCollect={(row) => void runAction(row, () => collectHomeCollection(row.id))}
                onFail={(row) => {
                  const reason = window.prompt("Failure reason (optional):") ?? "";
                  void runAction(row, () => failHomeCollection(row.id, reason));
                }}
                onRetry={(row) => void runAction(row, () => retryHomeCollection(row.id))}
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

      <CollectionDetailSheet
        row={selectedRow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        busy={busyId === selectedRow?.id}
        onAssign={(row) => setAssignTarget(row)}
        onStart={(row) => void runAction(row, () => startHomeCollection(row.id))}
        onCollect={(row) => void runAction(row, () => collectHomeCollection(row.id))}
        onFail={(row) => {
          const reason = window.prompt("Failure reason (optional):") ?? "";
          void runAction(row, () => failHomeCollection(row.id, reason));
        }}
        onRetry={(row) => void runAction(row, () => retryHomeCollection(row.id))}
      />

      <AssignCollectionDialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
        loading={busyId === assignTarget?.id}
        onConfirm={(assignmentNote) => {
          if (!assignTarget) return;
          const payload = assignmentNote ? { assignment_note: assignmentNote } : undefined;
          void runAction(assignTarget, () => assignHomeCollection(assignTarget.id, payload)).then(() =>
            setAssignTarget(null),
          );
        }}
      />
    </div>
  );
}
