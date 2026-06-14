"use client";

import Link from "next/link";
import { VisitDetailSheet } from "@/components/helpdesk/visits/VisitDetailSheet";
import { UpcomingAppointmentsTable } from "@/components/helpdesk/visits/UpcomingAppointmentsTable";
import {
  VisitsSummaryCards,
  VisitsSummaryCardsSkeleton,
} from "@/components/helpdesk/visits/VisitsSummaryCards";
import { VisitsFilters } from "@/components/helpdesk/visits/VisitsFilters";
import { VisitsTable } from "@/components/helpdesk/visits/VisitsTable";
import { LabOrdersPagination } from "@/components/labs/orders/LabOrdersPagination";
import { Button } from "@/components/ui/button";
import { useHelpdeskVisitsList } from "@/hooks/useHelpdeskVisitsList";
import { prescriptionDownloadUrl } from "@/lib/api/visits";
import { exportVisitsCsv, type HelpdeskVisitRow } from "@/lib/helpdesk/mapVisitListRow";
import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  toastCheckInError,
  toastCheckInSuccess,
} from "@/lib/helpdesk/checkInAppointment";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import { CalendarPlus, Download, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export default function HelpdeskVisitsPage() {
  const {
    viewMode,
    setViewMode,
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
    upcomingRows,
    upcomingCount,
    total,
    totalPages,
    summary,
    doctors,
    doctorsLoading,
    loading,
    isRefreshing,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton,
    checkingInId,
    checkInUpcomingAppointment,
  } = useHelpdeskVisitsList();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<HelpdeskVisitRow | null>(null);
  const isUpcoming = viewMode === "upcoming";

  const openRow = useCallback((row: HelpdeskVisitRow) => {
    setSelectedRow(row);
    setSheetOpen(true);
  }, []);

  const handleViewPrescription = useCallback((row: HelpdeskVisitRow) => {
    if (!row.prescriptionId) {
      toast.error("No prescription available for this visit.");
      return;
    }
    window.open(prescriptionDownloadUrl(row.prescriptionId), "_blank", "noopener,noreferrer");
  }, []);

  const handleDownloadPrescription = useCallback((row: HelpdeskVisitRow) => {
    if (!row.prescriptionId) {
      toast.error("No prescription available for this visit.");
      return;
    }
    const link = document.createElement("a");
    link.href = prescriptionDownloadUrl(row.prescriptionId);
    link.download = `prescription-${row.visitPnr}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }, []);

  const handleExport = useCallback(() => {
    if (!rows.length) {
      toast.message("No rows on this page to export.");
      return;
    }
    exportVisitsCsv(rows);
    toast.success("Exported current page to CSV.");
  }, [rows]);

  const handleCheckIn = useCallback(
    async (appointment: Appointment) => {
      try {
        const data = await checkInUpcomingAppointment(appointment.id);
        toastCheckInSuccess(data.message);
        void useHelpdeskQueueStore.getState().fetchTodayQueue().catch(() => undefined);
      } catch (err) {
        toastCheckInError(err);
      }
    },
    [checkInUpcomingAppointment],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-3 pb-28 md:px-4 md:py-4 md:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Visits</h1>
          <p className="text-sm text-muted-foreground">
            {isUpcoming
              ? "Upcoming scheduled appointments"
              : "View all completed patient encounters"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {!isUpcoming ? (
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          ) : (
            <Button type="button" size="sm" asChild>
              <Link href="/helpdesk/appointments/book">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book appointment
              </Link>
            </Button>
          )}
        </div>
      </header>

      {showInitialSkeleton ? (
        <VisitsSummaryCardsSkeleton />
      ) : (
        <VisitsSummaryCards
          summary={summary}
          upcomingCount={upcomingCount}
          activeView={viewMode}
          onViewSelect={setViewMode}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={!isUpcoming ? "default" : "outline"}
          onClick={() => setViewMode("visits")}
        >
          Past visits
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isUpcoming ? "default" : "outline"}
          onClick={() => setViewMode("upcoming")}
        >
          Upcoming appointments
        </Button>
      </div>

      <VisitsFilters
        filters={filters}
        onFiltersChange={setFilters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        doctors={doctors}
        doctorsLoading={doctorsLoading}
        onReset={resetFilters}
        disabled={loading}
        upcomingMode={isUpcoming}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : loading && (isUpcoming ? !upcomingRows.length : !rows.length) ? (
        <div className="rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
          {isUpcoming ? "Loading upcoming appointments…" : "Loading visits…"}
        </div>
      ) : isUpcoming ? (
        !upcomingRows.length ? (
          <div className="rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
            No upcoming appointments found.
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/helpdesk/appointments/book">Book appointment</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
            {isRefreshing ? (
              <p className="border-b px-4 py-2 text-xs text-muted-foreground">Refreshing…</p>
            ) : null}
            <div className="p-4">
              <UpcomingAppointmentsTable
                rows={upcomingRows}
                checkingInId={checkingInId}
                onCheckIn={handleCheckIn}
                actionDisabled={Boolean(checkingInId)}
              />
            </div>
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Check in and manage appointments from{" "}
              <Link href="/helpdesk/appointments" className="font-medium text-primary underline-offset-2 hover:underline">
                Appointments
              </Link>
              .
            </p>
          </div>
        )
      ) : !rows.length ? (
        <div className="rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
          No visits found for the selected filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
          {isRefreshing ? (
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">Refreshing…</p>
          ) : null}
          <VisitsTable
            rows={rows}
            onRowOpen={openRow}
            onViewPrescription={handleViewPrescription}
            onDownloadPrescription={handleDownloadPrescription}
          />
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
        </div>
      )}

      <VisitDetailSheet row={selectedRow} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
