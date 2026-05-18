"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  fetchPricingCatalogSummary,
  fetchPricingPackagesList,
  fetchPricingServicesList,
} from "@/lib/labs/api/pricing-services";
import type { PricingCatalogSummary } from "@/lib/labs/api/pricing-services-types";
import {
  buildPricingQueryFromFilters,
  DEFAULT_PRICING_SERVICES_FILTERS,
  detectSummaryCapsule,
  filtersForSummaryCapsule,
  type PricingCatalogTab,
  type PricingServicesFilterState,
  type PricingSummaryCapsuleId,
} from "@/lib/labs/pricing-services/build-pricing-services-query";
import {
  mapPackagePricingCatalogRow,
  mapServicePricingCatalogRow,
  type PackagePricingDrawerModel,
  type PackagePricingTableRow,
  type ServicePricingDrawerModel,
  type ServicePricingTableRow,
} from "@/lib/labs/pricing-services/map-pricing-rows";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const EMPTY_SUMMARY: PricingCatalogSummary = {
  version: "v1",
  active_services: 0,
  active_packages: 0,
  home_collection_enabled: 0,
  avg_tat_hours: null,
  unavailable_tests: 0,
};

const INITIAL_CAPSULE: PricingSummaryCapsuleId = "available_tests";
const INITIAL_PRESET = filtersForSummaryCapsule(INITIAL_CAPSULE);

export function useLabPricingServices() {
  const [summaryCapsule, setSummaryCapsule] = useState<PricingSummaryCapsuleId | null>(INITIAL_CAPSULE);
  const [catalogTab, setCatalogTab] = useState<PricingCatalogTab>(INITIAL_PRESET.catalogTab);
  const [filters, setFilters] = useState<PricingServicesFilterState>(INITIAL_PRESET.filters);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [serviceTableRows, setServiceTableRows] = useState<ServicePricingTableRow[]>([]);
  const [serviceDrawerById, setServiceDrawerById] = useState<Record<string, ServicePricingDrawerModel>>(
    {},
  );
  const [packageTableRows, setPackageTableRows] = useState<PackagePricingTableRow[]>([]);
  const [packageDrawerById, setPackageDrawerById] = useState<Record<string, PackagePricingDrawerModel>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<PricingCatalogSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const debouncedQ = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const summaryCapsuleRef = useRef(summaryCapsule);
  summaryCapsuleRef.current = summaryCapsule;

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  const resetFilters = useCallback(() => {
    setSummaryCapsule(INITIAL_CAPSULE);
    setCatalogTab(INITIAL_PRESET.catalogTab);
    setFilters(INITIAL_PRESET.filters);
    setSearchInput("");
    setPage(1);
  }, []);

  const selectSummaryCapsule = useCallback((id: PricingSummaryCapsuleId) => {
    const prev = summaryCapsuleRef.current;
    if (prev === id) {
      setSummaryCapsule(null);
      setCatalogTab("services");
      setFilters(DEFAULT_PRICING_SERVICES_FILTERS);
    } else {
      const preset = filtersForSummaryCapsule(id);
      setSummaryCapsule(id);
      setCatalogTab(preset.catalogTab);
      setFilters(preset.filters);
    }
    setPage(1);
  }, []);

  const setFiltersAndSyncCapsule = useCallback(
    (next: PricingServicesFilterState) => {
      setFilters(next);
      setSummaryCapsule((prev) => {
        if (prev === "avg_tat") {
          const avgPreset = filtersForSummaryCapsule("avg_tat");
          if (
            catalogTab === avgPreset.catalogTab &&
            next.availability === avgPreset.filters.availability &&
            next.activeStatus === avgPreset.filters.activeStatus &&
            next.homeCollection === avgPreset.filters.homeCollection &&
            next.tatPreset === avgPreset.filters.tatPreset
          ) {
            return "avg_tat";
          }
        }
        return detectSummaryCapsule(catalogTab, next);
      });
    },
    [catalogTab],
  );

  const setCatalogTabAndClearCapsule = useCallback((tab: PricingCatalogTab) => {
    setCatalogTab(tab);
    setSummaryCapsule(null);
    setFilters(DEFAULT_PRICING_SERVICES_FILTERS);
    setPage(1);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      const ordering =
        summaryCapsule != null ? filtersForSummaryCapsule(summaryCapsule).ordering : undefined;
      const query = buildPricingQueryFromFilters(filters, {
        q: debouncedQ.trim() || undefined,
        page,
        page_size: pageSize,
        ordering,
      });
      try {
        const summaryPromise = fetchPricingCatalogSummary({ signal });
        const listPromise =
          catalogTab === "services"
            ? fetchPricingServicesList(query, { signal })
            : fetchPricingPackagesList(query, { signal });

        const [summaryRes, listRes] = await Promise.all([summaryPromise, listPromise]);
        if (signal?.aborted) return;

        setSummary(summaryRes);
        if (catalogTab === "services") {
          const catalog = listRes.results.map(mapServicePricingCatalogRow);
          setServiceTableRows(catalog.map((r) => r.table));
          setServiceDrawerById(
            Object.fromEntries(catalog.map((r) => [r.drawer.id, r.drawer])),
          );
          setPackageTableRows([]);
          setPackageDrawerById({});
        } else {
          const catalog = listRes.results.map(mapPackagePricingCatalogRow);
          setPackageTableRows(catalog.map((r) => r.table));
          setPackageDrawerById(
            Object.fromEntries(catalog.map((r) => [r.drawer.id, r.drawer])),
          );
          setServiceTableRows([]);
          setServiceDrawerById({});
        }
        setTotal(listRes.total);
        setTotalPages(listRes.total_pages);
        setLastFetchedAt(new Date().toISOString());
      } catch (err: unknown) {
        if (axios.isCancel(err) || signal?.aborted) return;
        const ax = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(ax?.response?.data?.detail || ax?.message || "Unable to load catalog.");
        setServiceTableRows([]);
        setServiceDrawerById({});
        setPackageTableRows([]);
        setPackageDrawerById({});
        setTotal(0);
        setTotalPages(0);
        setSummary(EMPTY_SUMMARY);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setInitialLoaded(true);
        }
      }
    },
    [catalogTab, debouncedQ, filters, page, pageSize, summaryCapsule],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [catalogTab, filters, debouncedQ, summaryCapsule]);

  return {
    catalogTab,
    setCatalogTab: setCatalogTabAndClearCapsule,
    summaryCapsule,
    selectSummaryCapsule,
    filters,
    setFilters: setFiltersAndSyncCapsule,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    serviceTableRows,
    serviceDrawerById,
    packageTableRows,
    packageDrawerById,
    total,
    totalPages,
    summary,
    loading,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton: !initialLoaded && loading,
    isRefreshing: initialLoaded && loading,
    lastFetchedAt,
  };
}
