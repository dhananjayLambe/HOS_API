"use client";

import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { LabOrdersPagination } from "@/components/labs/orders/LabOrdersPagination";
import { LabOrdersTableSkeleton } from "@/components/labs/orders/LabOrdersTableSkeleton";
import { PackagePricingDetailDrawer } from "@/components/labs/pricing-services/PackagePricingDetailDrawer";
import { PackagePricingTable } from "@/components/labs/pricing-services/PackagePricingTable";
import { PricingCatalogCountBar } from "@/components/labs/pricing-services/PricingCatalogCountBar";
import { PricingCatalogStickyToolbar } from "@/components/labs/pricing-services/PricingCatalogStickyToolbar";
import { PricingServiceDetailDrawer } from "@/components/labs/pricing-services/PricingServiceDetailDrawer";
import { PricingServicesSummaryCards } from "@/components/labs/pricing-services/PricingServicesSummaryCards";
import { PricingServicesSummaryCardsSkeleton } from "@/components/labs/pricing-services/PricingServicesSummaryCardsSkeleton";
import { ServicePricingTable } from "@/components/labs/pricing-services/ServicePricingTable";
import { formatRelativeSyncTime } from "@/components/labs/pricing-services/format-sync-time";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { Button } from "@/components/ui/button";
import { useLabPricingServices } from "@/hooks/labs/useLabPricingServices";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import {
  PRICING_SUMMARY_CAPSULE_LABELS,
  pricingHasActiveFilters,
} from "@/lib/labs/pricing-services/build-pricing-services-query";
import type {
  PackagePricingTableRow,
  ServicePricingTableRow,
} from "@/lib/labs/pricing-services/map-pricing-rows";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { cn } from "@/lib/utils";
import { Loader2, Lock, RotateCcw, SearchX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function LabPricingServicesPage() {
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";

  const {
    catalogTab,
    setCatalogTab,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    serviceTableRows,
    serviceDrawerById,
    packageTableRows,
    packageDrawerById,
    total,
    totalPages,
    summary,
    loading,
    isRefreshing,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton,
    lastFetchedAt,
    summaryCapsule,
    selectSummaryCapsule,
  } = useLabPricingServices();

  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [packageSheetOpen, setPackageSheetOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const selectedService = useMemo(
    () => (selectedServiceId ? (serviceDrawerById[selectedServiceId] ?? null) : null),
    [serviceDrawerById, selectedServiceId],
  );
  const selectedPackage = useMemo(
    () => (selectedPackageId ? (packageDrawerById[selectedPackageId] ?? null) : null),
    [packageDrawerById, selectedPackageId],
  );

  const openService = (row: ServicePricingTableRow) => {
    setSelectedServiceId(row.id);
    setServiceSheetOpen(true);
  };
  const openPackage = (row: PackagePricingTableRow) => {
    setSelectedPackageId(row.id);
    setPackageSheetOpen(true);
  };

  const headerActions = useMemo(
    () => (
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        {lastFetchedAt ? (
          <span className="text-[11px] text-[#9CA3AF]">{formatRelativeSyncTime(lastFetchedAt)}</span>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RotateCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>
    ),
    [lastFetchedAt, loading, refetch],
  );

  useLabShellHeader({
    title: "Pricing & Services",
    description: branchLabel
      ? `${branchLabel} — operational diagnostics catalog and branch fulfillment visibility.`
      : "Operational diagnostics catalog and branch fulfillment visibility.",
    actions: headerActions,
  });

  const displayRows = catalogTab === "services" ? serviceTableRows : packageTableRows;
  const hasFilterQuery = pricingHasActiveFilters(filters, searchInput);
  const showTable = !error && !showInitialSkeleton && displayRows.length > 0;
  const showEmpty = !error && !showInitialSkeleton && !loading && displayRows.length === 0;

  const emptyTitle = hasFilterQuery
    ? catalogTab === "services"
      ? "No matching services found"
      : "No matching packages found"
    : catalogTab === "services"
      ? "No services available"
      : "No packages configured";

  const activeViewLabel = summaryCapsule ? PRICING_SUMMARY_CAPSULE_LABELS[summaryCapsule] : null;

  const emptyDescription = hasFilterQuery
    ? summaryCapsule
      ? `No rows match the “${activeViewLabel}” view. Try another capsule, search, or filters.`
      : "Try adjusting search or filters."
    : catalogTab === "services"
      ? "Catalog rows appear after the next operational pricing sync."
      : "Package pricing will appear once configured for your branch.";

  const handleCatalogTabChange = useCallback(
    (tab: typeof catalogTab) => {
      setCatalogTab(tab);
      setSelectedServiceId(null);
      setSelectedPackageId(null);
      setServiceSheetOpen(false);
      setPackageSheetOpen(false);
    },
    [setCatalogTab],
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/80 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug text-[#111827]">
            Catalog updates are managed through centralized operational pricing sync.
          </p>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">
            Editing and approval workflows will be enabled in a future phase.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#6B7280]">
          <Lock className="h-3 w-3 text-[#7C5CFC]" aria-hidden />
          <span>Read-only catalog</span>
        </div>
      </div>

      {showInitialSkeleton ? (
        <PricingServicesSummaryCardsSkeleton />
      ) : (
        <PricingServicesSummaryCards
          summary={summary}
          selectedCapsule={summaryCapsule}
          onCapsuleSelect={selectSummaryCapsule}
        />
      )}

      <PricingCatalogStickyToolbar
        catalogTab={catalogTab}
        onCatalogTabChange={handleCatalogTabChange}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={resetFilters}
        disabled={showInitialSkeleton}
      />

      <SectionCard
        compact
        title={catalogTab === "services" ? "Services catalog" : "Packages catalog"}
        subtitle={
          activeViewLabel
            ? `Filtered by “${activeViewLabel}”. Click a row for operational detail.`
            : "Click a row for operational detail."
        }
      >
        {showInitialSkeleton ? (
          <LabOrdersTableSkeleton />
        ) : error ? (
          <div className="p-3">
            <LabOrdersErrorState message={error} onRetry={refetch} retrying={loading} />
          </div>
        ) : showEmpty ? (
          <div className="p-4">
            <LabEmptyState
              title={emptyTitle}
              description={emptyDescription}
              illustration={
                hasFilterQuery ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F1FF] text-[#7C5CFC]">
                    <SearchX className="h-5 w-5" aria-hidden />
                  </div>
                ) : undefined
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {hasFilterQuery ? (
                    <Button type="button" variant="secondary" className="h-8 text-xs" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => refetch()}>
                    Refresh
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {isRefreshing ? (
              <div className="flex items-center gap-2 border-b border-[#ECEBFF] bg-[#FAF9FF]/60 px-4 py-1.5 text-xs text-[#6B7280]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C5CFC]" aria-hidden />
                Updating catalog…
              </div>
            ) : null}
            <PricingCatalogCountBar
              catalogTab={catalogTab}
              page={page}
              pageSize={pageSize}
              total={total}
              rowCount={displayRows.length}
              activeViewLabel={activeViewLabel}
            />
            {showTable && catalogTab === "services" ? (
              <ServicePricingTable rows={serviceTableRows} onRowOpen={openService} dimmed={isRefreshing} />
            ) : null}
            {showTable && catalogTab === "packages" ? (
              <PackagePricingTable rows={packageTableRows} onRowOpen={openPackage} dimmed={isRefreshing} />
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

      <PricingServiceDetailDrawer
        row={selectedService}
        open={serviceSheetOpen}
        onOpenChange={setServiceSheetOpen}
      />
      <PackagePricingDetailDrawer
        row={selectedPackage}
        open={packageSheetOpen}
        onOpenChange={setPackageSheetOpen}
      />
    </div>
  );
}
