"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchVisitAppointmentsList, fetchVisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments";
import type { VisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments-types";
import {
  DEFAULT_VISIT_APPOINTMENTS_FILTERS,
  statusParamForTab,
  type VisitAppointmentsFilterState,
} from "@/lib/labs/visit-appointments/build-visit-appointments-query";
import { mapVisitAppointmentListItem } from "@/lib/labs/visit-appointments/map-appointment-row";
import type { LabAppointmentRow } from "@/lib/labs/types";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const POLL_INTERVAL_MS = 30_000;

const EMPTY_SUMMARY: VisitAppointmentsSummary = {
  scheduled_today: 0,
  confirmed_today: 0,
  checked_in: 0,
  completed_today: 0,
  failed_no_show: 0,
};

export function useLabVisitAppointmentsList() {
  const [filters, setFilters] = useState<VisitAppointmentsFilterState>(DEFAULT_VISIT_APPOINTMENTS_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<LabAppointmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<VisitAppointmentsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const initialLoadedRef = useRef(false);
  const debouncedQ = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_VISIT_APPOINTMENTS_FILTERS);
    setSearchInput("");
    setPage(1);
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    const isInitial = !initialLoadedRef.current;
    if (isInitial) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const status = statusParamForTab(filters.statusTab);
      const [listRes, summaryRes] = await Promise.all([
        fetchVisitAppointmentsList(
          {
            q: debouncedQ.trim() || undefined,
            status: status || undefined,
            date_preset: filters.datePreset || undefined,
            page,
            page_size: pageSize,
          },
          { signal },
        ),
        fetchVisitAppointmentsSummary(filters.datePreset || "today", { signal }),
      ]);
      if (signal?.aborted) return;
      setRows(listRes.results.map(mapVisitAppointmentListItem));
      setTotal(listRes.total);
      setTotalPages(listRes.total_pages);
      setSummary(summaryRes);
    } catch (err: unknown) {
      if (axios.isCancel(err) || signal?.aborted) return;
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(ax?.response?.data?.detail || ax?.message || "Unable to load visit appointments.");
      setRows([]);
      setTotal(0);
      setTotalPages(0);
      setSummary(EMPTY_SUMMARY);
    } finally {
      if (!signal?.aborted) {
        if (isInitial) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
        initialLoadedRef.current = true;
        setInitialLoaded(true);
      }
    }
  }, [debouncedQ, filters.statusTab, filters.datePreset, page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [filters.statusTab, filters.datePreset, debouncedQ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    rows,
    total,
    totalPages,
    summary,
    loading,
    isRefreshing,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton: !initialLoaded && loading,
  };
}
