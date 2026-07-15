"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { fetchLabOrdersList } from "@/lib/labs/api/orders";
import type { LabOrdersListResponse } from "@/lib/labs/api/orders-types";
import {
  DEFAULT_LAB_ORDERS_FILTERS,
  type LabOrdersFilterState,
  type LabOrdersStatusFilter,
} from "@/lib/labs/orders/build-lab-orders-query";
import { mapLabOrderListItems } from "@/lib/labs/orders/map-order-row";
import { PHASE1_ORDER_FILTER_STATUSES } from "@/lib/labs/constants/order-filters";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { sessionHasOperationalAccess } from "@/lib/labs/session/lab-session-types";
import type { LabOrderRow } from "@/lib/labs/types";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
/** Background refresh while the orders page is open (tab visible). */
const LAB_ORDERS_POLL_INTERVAL_MS = 30_000;

type LabOrdersFetchParams = {
  filters: LabOrdersFilterState;
  page: number;
  pageSize: number;
  q: string;
};

function isStatusFilter(value: string | null): value is LabOrdersStatusFilter {
  if (value === "all" || value === null) return true;
  return (PHASE1_ORDER_FILTER_STATUSES as readonly string[]).includes(value);
}

export type UseLabOrdersListResult = {
  filters: LabOrdersFilterState;
  setFilters: (next: LabOrdersFilterState) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  pageSizeOptions: readonly number[];
  rows: LabOrderRow[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  resetFilters: () => void;
  showInitialSkeleton: boolean;
};

export function useLabOrdersList(branchLabel = ""): UseLabOrdersListResult {
  const { data: session, status: sessionStatus } = useLabSession();
  const canFetch = sessionStatus === "success" && sessionHasOperationalAccess(session);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = searchParams.get("q") || "";
  const statusFromUrl = searchParams.get("status");
  const pageFromUrl = Number(searchParams.get("page") || "1");

  const [filters, setFilters] = useState<LabOrdersFilterState>(() => ({
    ...DEFAULT_LAB_ORDERS_FILTERS,
    search: qFromUrl,
    status: isStatusFilter(statusFromUrl) && statusFromUrl ? statusFromUrl : "all",
  }));
  const [searchInput, setSearchInput] = useState(qFromUrl);
  const [page, setPageState] = useState(() => (Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1));
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<LabOrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const toast = useToastNotification();
  const toastSuccessRef = useRef(toast.success);
  toastSuccessRef.current = toast.success;
  const refetchTokenRef = useRef(0);
  const previousTotalRef = useRef<number | null>(null);
  const fetchParamsRef = useRef<LabOrdersFetchParams>({
    filters,
    page,
    pageSize,
    q: debouncedQ,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  fetchParamsRef.current = { filters, page, pageSize, q: debouncedQ };

  useEffect(() => {
    const nextStatus: LabOrdersStatusFilter =
      statusFromUrl && (PHASE1_ORDER_FILTER_STATUSES as readonly string[]).includes(statusFromUrl)
        ? (statusFromUrl as LabOrdersStatusFilter)
        : "all";
    setSearchInput(qFromUrl);
    setFilters((prev) => ({ ...prev, search: qFromUrl, status: nextStatus }));
    if (Number.isFinite(pageFromUrl) && pageFromUrl > 0) {
      setPageState(pageFromUrl);
    }
  }, [qFromUrl, statusFromUrl, pageFromUrl]);


  const syncUrl = useCallback(
    (next: { q?: string; status?: LabOrdersStatusFilter; page?: number }) => {
      const params = new URLSearchParams();
      const q = (next.q ?? debouncedQ).trim();
      const status = next.status ?? filters.status;
      const nextPage = next.page ?? page;

      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (nextPage > 1) params.set("page", String(nextPage));

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [debouncedQ, filters.status, page, pathname, router],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (debouncedQ.trim() !== qFromUrl.trim()) {
        syncUrl({ q: debouncedQ, page: 1 });
        setPageState(1);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [debouncedQ, qFromUrl, syncUrl]);

  useEffect(() => {
    setPageState(1);
  }, [filters.collectionType, filters.urgency, filters.datePreset]);

  useEffect(() => {
    previousTotalRef.current = null;
  }, [filters.datePreset, filters.status, filters.collectionType, filters.urgency, debouncedQ]);

  const handleFiltersChange = useCallback(
    (next: LabOrdersFilterState) => {
      setFilters(next);
      if (next.status !== filters.status) {
        syncUrl({ status: next.status, page: 1 });
        setPageState(1);
      }
    },
    [filters.status, syncUrl],
  );

  const loadOrders = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      const silent = options?.silent ?? false;
      const snapshot = fetchParamsRef.current;
      const token = silent ? null : ++refetchTokenRef.current;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetchLabOrdersList(snapshot, {
          signal: options?.signal,
        });
        if (options?.signal?.aborted) return;
        if (!silent && token !== refetchTokenRef.current) return;

        if (silent) {
          const current = fetchParamsRef.current;
          const unchanged =
            current.page === snapshot.page &&
            current.pageSize === snapshot.pageSize &&
            current.q === snapshot.q &&
            current.filters === snapshot.filters;
          if (!unchanged) return;
        }

        if (
          silent &&
          previousTotalRef.current !== null &&
          response.total > previousTotalRef.current
        ) {
          const delta = response.total - previousTotalRef.current;
          toastSuccessRef.current(
            delta === 1
              ? "1 new order added to your queue"
              : `${delta} new orders added to your queue`,
          );
        }
        previousTotalRef.current = response.total;
        setData(response);
        if (!silent) setError(null);
      } catch (err: unknown) {
        if (axios.isCancel(err) || options?.signal?.aborted) return;
        if (!silent && token !== refetchTokenRef.current) return;
        if (silent) return;

        const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
        const message =
          ax?.response?.data?.detail ||
          ax?.response?.data?.message ||
          ax?.message ||
          "Unable to load orders.";
        setError(typeof message === "string" ? message : "Unable to load orders.");
        setData({
          results: [],
          page: 1,
          page_size: snapshot.pageSize,
          total: 0,
          total_pages: 0,
        });
      } finally {
        if (!silent && token === refetchTokenRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!canFetch) {
      setLoading(sessionStatus === "pending");
      return;
    }
    const controller = new AbortController();
    void loadOrders({ signal: controller.signal });
    return () => controller.abort();
  }, [filters, page, pageSize, debouncedQ, refreshKey, loadOrders, canFetch, sessionStatus]);

  useEffect(() => {
    if (!canFetch) return;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void loadOrders({ silent: true });
    };

    const intervalId = window.setInterval(poll, LAB_ORDERS_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadOrders({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadOrders, canFetch]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_LAB_ORDERS_FILTERS);
    setSearchInput("");
    setPageState(1);
    setPageSizeState(DEFAULT_PAGE_SIZE);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const setPage = useCallback(
    (next: number) => {
      const safe = Math.max(1, next);
      setPageState(safe);
      syncUrl({ page: safe });
    },
    [syncUrl],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const rows = useMemo(
    () => mapLabOrderListItems(data?.results ?? [], branchLabel),
    [data?.results, branchLabel],
  );

  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? (total > 0 ? Math.ceil(total / pageSize) : 0);

  return {
    filters,
    setFilters: handleFiltersChange,
    searchInput,
    setSearchInput,
    page,
    pageSize,
    setPage,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    rows,
    total,
    totalPages,
    loading,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton: loading && !data,
  };
}
