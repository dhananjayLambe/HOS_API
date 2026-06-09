"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AlertTriangle, FileX2, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import {
  DEFAULT_FILTERS,
  PrescriptionsFilters,
  rangeForPreset,
  type DatePresetId,
  type PrescriptionsFilterValues,
} from "@/components/prescriptions/prescriptions-filters";
import { PrescriptionsList, type PrescriptionRowAction } from "@/components/prescriptions/prescriptions-list";
import { PrescriptionsPagination } from "@/components/prescriptions/prescriptions-pagination";
import {
  PrescriptionsFiltersSkeleton,
  PrescriptionsListSkeleton,
} from "@/components/prescriptions/prescriptions-skeletons";
import { PrescriptionPreviewDrawer } from "@/components/prescriptions/prescription-preview-drawer";
import { CancelPrescriptionModal } from "@/components/prescriptions/cancel-prescription-modal";

import {
  cancelPrescription,
  downloadPrescriptionPdf,
  listPrescriptions,
  type PrescriptionListItem,
  type PrescriptionListResponse,
  type PrescriptionStatusFilter,
  type WhatsAppStatusFilter,
} from "@/lib/api/prescriptions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useToastNotification } from "@/hooks/use-toast-notification";

const PAGE_SIZE = 20;

const isStatusFilter = (value: string | null): value is PrescriptionStatusFilter =>
  value === "all" || value === "active" || value === "cancelled";

const isWhatsAppStatusFilter = (value: string | null): value is WhatsAppStatusFilter =>
  value === "all" ||
  value === "delivered" ||
  value === "failed" ||
  value === "pending" ||
  value === "skipped";

const isPreset = (value: string | null): value is DatePresetId =>
  value === "today" || value === "7d" || value === "30d" || value === "custom";

const filtersFromUrl = (params: URLSearchParams): { filters: PrescriptionsFilterValues; page: number } => {
  const presetParam = params.get("preset");
  const preset: DatePresetId = isPreset(presetParam) ? presetParam : DEFAULT_FILTERS.preset;
  const dateRange = preset === "custom"
    ? {
        from: params.get("date_from") || DEFAULT_FILTERS.date_from,
        to: params.get("date_to") || DEFAULT_FILTERS.date_to,
      }
    : rangeForPreset(preset);

  const statusParam = params.get("status");
  const status: PrescriptionStatusFilter = isStatusFilter(statusParam) ? statusParam : "all";
  const whatsappParam = params.get("whatsapp_status");
  const whatsapp_status: WhatsAppStatusFilter = isWhatsAppStatusFilter(whatsappParam)
    ? whatsappParam
    : "all";

  const pageParam = Number(params.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  return {
    filters: {
      search: params.get("q") || "",
      status,
      whatsapp_status,
      preset,
      date_from: dateRange.from,
      date_to: dateRange.to,
    },
    page,
  };
};

const buildSearchString = (filters: PrescriptionsFilterValues, page: number): string => {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.whatsapp_status !== "all") params.set("whatsapp_status", filters.whatsapp_status);
  if (filters.preset !== "today") params.set("preset", filters.preset);
  if (filters.preset === "custom") {
    params.set("date_from", filters.date_from);
    params.set("date_to", filters.date_to);
  }
  if (page > 1) params.set("page", String(page));
  return params.toString();
};

interface PageState {
  count: number;
  page: number;
  page_size: number;
  results: PrescriptionListItem[];
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();

  const initialState = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    return filtersFromUrl(params);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<PrescriptionsFilterValues>(initialState.filters);
  const [page, setPage] = useState<number>(initialState.page);
  const [data, setData] = useState<PageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerRow, setDrawerRow] = useState<PrescriptionListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAutoPrint, setDrawerAutoPrint] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingCancelRow, setPendingCancelRow] = useState<PrescriptionListItem | null>(null);
  const [isCancellingFromList, setIsCancellingFromList] = useState(false);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const refetchTokenRef = useRef(0);

  // URL sync: write filter+page state into the URL for back/forward preservation.
  useEffect(() => {
    const next = buildSearchString(filters, page);
    const current = searchParams?.toString() || "";
    if (next === current) return;
    router.replace(next ? `?${next}` : "?", { scroll: false });
  }, [filters, page, router, searchParams]);

  // Reset page to 1 whenever filters (other than page itself) change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.whatsapp_status, filters.preset, filters.date_from, filters.date_to]);

  // Fetch list whenever effective query changes.
  useEffect(() => {
    const controller = new AbortController();
    const token = ++refetchTokenRef.current;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const res = await listPrescriptions(
          {
            search: debouncedSearch,
            status: filters.status,
            whatsapp_status: filters.whatsapp_status,
            date_from: filters.date_from,
            date_to: filters.date_to,
            page,
            page_size: PAGE_SIZE,
          },
          { signal: controller.signal }
        );
        if (token !== refetchTokenRef.current) return;
        const payload: PrescriptionListResponse = res.data;
        setData({
          count: payload.count ?? 0,
          page: payload.page ?? page,
          page_size: payload.page_size ?? PAGE_SIZE,
          results: payload.results ?? [],
        });
      } catch (error: any) {
        if (axios.isCancel(error) || controller.signal.aborted) return;
        if (token !== refetchTokenRef.current) return;
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load prescriptions.";
        setLoadError(message);
        setData({ count: 0, page: 1, page_size: PAGE_SIZE, results: [] });
      } finally {
        if (token === refetchTokenRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedSearch, filters.status, filters.whatsapp_status, filters.date_from, filters.date_to, page]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleRowOpen = useCallback((row: PrescriptionListItem) => {
    setDrawerAutoPrint(false);
    setDrawerRow(row);
    setDrawerOpen(true);
  }, []);

  const handleListPrint = useCallback((row: PrescriptionListItem) => {
    if (row.is_cancelled) return;
    setDrawerAutoPrint(true);
    setDrawerRow(row);
    setDrawerOpen(true);
  }, []);

  const handleListDownload = useCallback(
    async (row: PrescriptionListItem) => {
      if (row.is_cancelled) return;
      setDownloadingId(row.consultation_id);
      try {
        await downloadPrescriptionPdf(row.consultation_id, row.pnr);
        toast.success("Prescription downloaded successfully");
      } catch (error: any) {
        const message = error?.message || "Unable to download prescription";
        toast.error(message, {
          action: {
            label: "Retry",
            onClick: () => {
              void handleListDownload(row);
            },
          },
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [toast]
  );

  const handleListCancelConfirm = useCallback(
    async (reason: string, reasonText?: string) => {
      if (!pendingCancelRow) return;
      setIsCancellingFromList(true);
      try {
        await cancelPrescription(pendingCancelRow.consultation_id, {
          reason_code: reason,
          reason_text: reasonText || "",
          source: "doctor",
        });
        toast.warning("Prescription marked as cancelled.");
        setPendingCancelRow(null);
        // Optimistically flip the row in current page; refetch to stay consistent.
        setData((prev) =>
          prev
            ? {
                ...prev,
                results: prev.results.map((item) =>
                  item.consultation_id === pendingCancelRow.consultation_id
                    ? { ...item, is_cancelled: true, cancelled_at: new Date().toISOString() }
                    : item
                ),
              }
            : prev
        );
        refetchTokenRef.current++; // triggers stale-token bail in any in-flight; effect re-runs below
        setPage((p) => p);
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Failed to cancel prescription.";
        toast.error(message);
      } finally {
        setIsCancellingFromList(false);
      }
    },
    [pendingCancelRow, toast]
  );

  const handleAction = useCallback(
    (action: PrescriptionRowAction) => {
      switch (action.type) {
        case "view":
          handleRowOpen(action.row);
          break;
        case "print":
          handleListPrint(action.row);
          break;
        case "download":
          void handleListDownload(action.row);
          break;
        case "cancel":
          setPendingCancelRow(action.row);
          break;
      }
    },
    [handleListDownload, handleListPrint, handleRowOpen]
  );

  const handleDrawerCancelled = useCallback((consultationId: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            results: prev.results.map((item) =>
              item.consultation_id === consultationId
                ? { ...item, is_cancelled: true, cancelled_at: new Date().toISOString() }
                : item
            ),
          }
        : prev
    );
  }, []);

  const total = data?.count ?? 0;
  const items = data?.results ?? [];
  const showInitialSkeleton = loading && !data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">My Prescriptions</h1>
        <p className="text-sm text-muted-foreground">
          View, print, and manage previously generated prescriptions.
        </p>
      </div>

      {showInitialSkeleton ? (
        <>
          <PrescriptionsFiltersSkeleton />
          <PrescriptionsListSkeleton />
        </>
      ) : (
        <>
          <PrescriptionsFilters
            values={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
          />

          {loadError ? (
            <Alert className="border-red-200 bg-red-50 text-red-900">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load prescriptions</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <PrescriptionsListSkeleton />
          ) : items.length === 0 && !loadError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileX2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">No prescriptions found.</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting filters or search terms.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="min-h-11"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          ) : (
            <PrescriptionsList
              items={items}
              onRowOpen={handleRowOpen}
              onAction={handleAction}
              busyConsultationId={downloadingId}
            />
          )}

          {!loading && !loadError && total > 0 ? (
            <PrescriptionsPagination
              page={page}
              pageSize={data?.page_size ?? PAGE_SIZE}
              total={total}
              onPageChange={(next) => setPage(Math.max(1, next))}
            />
          ) : null}
        </>
      )}

      <PrescriptionPreviewDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setDrawerAutoPrint(false);
        }}
        row={drawerRow}
        onCancelled={handleDrawerCancelled}
        autoPrint={drawerAutoPrint}
        onAutoPrintHandled={() => setDrawerAutoPrint(false)}
      />

      <CancelPrescriptionModal
        open={Boolean(pendingCancelRow)}
        onOpenChange={(open) => {
          if (!open) setPendingCancelRow(null);
        }}
        onConfirm={handleListCancelConfirm}
        isSubmitting={isCancellingFromList}
      />

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #rx-print-area,
          #rx-print-area * {
            visibility: visible !important;
          }
          #rx-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
