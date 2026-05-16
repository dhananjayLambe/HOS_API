"use client";

import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { LabOrdersFilters } from "@/components/labs/orders/LabOrdersFilters";
import { LabOrdersPagination } from "@/components/labs/orders/LabOrdersPagination";
import { LabOrdersTable } from "@/components/labs/orders/LabOrdersTable";
import { LabOrdersTableSkeleton } from "@/components/labs/orders/LabOrdersTableSkeleton";
import { OrderDetailSheet } from "@/components/labs/orders/OrderDetailSheet";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { Button } from "@/components/ui/button";
import { useLabOrdersList } from "@/hooks/labs/useLabOrdersList";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import type { LabOrderRow } from "@/lib/labs/types";
import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

export function LabOrdersPage() {
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";

  const {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    page,
    pageSize,
    setPage,
    setPageSize,
    pageSizeOptions,
    rows,
    total,
    totalPages,
    loading,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton,
  } = useLabOrdersList(branchLabel);

  const [selected, setSelected] = useState<LabOrderRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openDetail = (order: LabOrderRow) => {
    setSelected(order);
    setSheetOpen(true);
  };

  const description = branchLabel
    ? `${branchLabel} branch — queue auto-refreshes every 30 seconds while this page is open.`
    : "Order queue auto-refreshes every 30 seconds while this page is open.";

  const showTable = !error && !showInitialSkeleton && rows.length > 0;
  const showEmpty = !error && !showInitialSkeleton && !loading && rows.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Orders"
        description={description}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        }
      />

      <LabOrdersFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        onFiltersChange={setFilters}
        disabled={showInitialSkeleton}
      />

      <SectionCard
        title="Order register"
        subtitle="Filtered list — row opens the detail drawer; actions stop propagation."
      >
        {showInitialSkeleton ? (
          <LabOrdersTableSkeleton />
        ) : error ? (
          <div className="p-4">
            <LabOrdersErrorState message={error} onRetry={refetch} retrying={loading} />
          </div>
        ) : showEmpty ? (
          <div className="p-4">
            <LabEmptyState
              title="No orders found"
              description="Try adjusting your search or filters, or refresh the queue."
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
                Loading orders…
              </div>
            ) : null}
            {showTable ? <LabOrdersTable rows={rows} onRowOpen={openDetail} /> : null}
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

      <OrderDetailSheet order={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

