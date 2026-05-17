"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchHomeCollectionsList, fetchHomeCollectionsSummary } from "@/lib/labs/api/home-collections";
import type { HomeCollectionsSummary } from "@/lib/labs/api/home-collections-types";
import {
  DEFAULT_HOME_COLLECTIONS_FILTERS,
  type HomeCollectionsFilterState,
} from "@/lib/labs/home-collections/build-home-collections-query";
import { mapHomeCollectionListItem } from "@/lib/labs/home-collections/map-collection-row";
import type { LabCollectionRow } from "@/lib/labs/types";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const POLL_INTERVAL_MS = 30_000;

const EMPTY_SUMMARY: HomeCollectionsSummary = {
  pending_collections: 0,
  assigned_today: 0,
  active_collections: 0,
  collected_today: 0,
  failed_no_response: 0,
};

export function useLabHomeCollectionsList() {
  const [filters, setFilters] = useState<HomeCollectionsFilterState>(DEFAULT_HOME_COLLECTIONS_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<LabCollectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<HomeCollectionsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const debouncedQ = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetchHomeCollectionsList(
          {
            q: debouncedQ.trim() || undefined,
            status: filters.statusTab || undefined,
            date_preset: filters.datePreset || undefined,
            page,
            page_size: pageSize,
          },
          { signal },
        ),
        fetchHomeCollectionsSummary(filters.datePreset || "today", { signal }),
      ]);
      if (signal?.aborted) return;
      setRows(listRes.results.map(mapHomeCollectionListItem));
      setTotal(listRes.total);
      setTotalPages(listRes.total_pages);
      setSummary(summaryRes);
    } catch (err: unknown) {
      if (axios.isCancel(err) || signal?.aborted) return;
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(ax?.response?.data?.detail || ax?.message || "Unable to load collections.");
      setRows([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
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
    error,
    refetch,
    showInitialSkeleton: !initialLoaded && loading,
  };
}
