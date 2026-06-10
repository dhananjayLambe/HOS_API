"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  isTemplateCategory,
  isTemplateCategoryFilter,
  isTemplateSortOption,
  sortOptionToOrdering,
  type TemplateCategoryFilter,
  type TemplateListFilters,
  type TemplateSortOption,
} from "@/lib/template-category";
import {
  listTemplates,
  type TemplateListItem,
} from "@/services/template-management.service";

export const TEMPLATE_LIST_PAGE_SIZE = 20;

export interface TemplateListState {
  count: number;
  page: number;
  page_size: number;
  results: TemplateListItem[];
}

const DEFAULT_FILTERS: TemplateListFilters = {
  category: "all",
  search: "",
  sort: "updated",
};

function filtersFromUrl(params: URLSearchParams): {
  filters: TemplateListFilters;
  page: number;
} {
  const categoryParam = params.get("category");
  const category: TemplateCategoryFilter = isTemplateCategoryFilter(categoryParam)
    ? categoryParam
    : "all";

  const sortParam = params.get("sort");
  const sort: TemplateSortOption = isTemplateSortOption(sortParam) ? sortParam : "updated";

  const pageParam = Number(params.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  return {
    filters: {
      category,
      search: params.get("q") || "",
      sort,
    },
    page,
  };
}

function buildSearchString(filters: TemplateListFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function useTemplateList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialState = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    return filtersFromUrl(params);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<TemplateListFilters>(initialState.filters);
  const [page, setPage] = useState(initialState.page);
  const [data, setData] = useState<TemplateListState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const refetchTokenRef = useRef(0);

  useEffect(() => {
    const next = buildSearchString(filters, page);
    const current = searchParams?.toString() || "";
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [filters, page, router, searchParams, pathname]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.category, filters.sort]);

  const refetch = useCallback(() => {
    refetchTokenRef.current += 1;
    const token = refetchTokenRef.current;

    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const res = await listTemplates({
          category:
            filters.category !== "all" && isTemplateCategory(filters.category)
              ? filters.category
              : undefined,
          search: debouncedSearch,
          page,
          page_size: TEMPLATE_LIST_PAGE_SIZE,
          ordering: sortOptionToOrdering(filters.sort),
        });
        if (token !== refetchTokenRef.current) return;
        const payload = res.data;
        setData({
          count: payload.count ?? 0,
          page,
          page_size: TEMPLATE_LIST_PAGE_SIZE,
          results: payload.results ?? [],
        });
      } catch (error: unknown) {
        if (axios.isCancel(error)) return;
        if (token !== refetchTokenRef.current) return;
        const err = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
        const message =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load templates.";
        setLoadError(message);
        setData({ count: 0, page: 1, page_size: TEMPLATE_LIST_PAGE_SIZE, results: [] });
      } finally {
        if (token === refetchTokenRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [debouncedSearch, filters.category, filters.sort, page]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleFiltersChange = useCallback((next: Partial<TemplateListFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((next: number) => {
    setPage(Math.max(1, next));
  }, []);

  return {
    filters,
    setFilters: handleFiltersChange,
    page,
    setPage: handlePageChange,
    data,
    loading,
    loadError,
    refetch,
    handleResetFilters,
    pageSize: TEMPLATE_LIST_PAGE_SIZE,
    showInitialSkeleton: loading && !data,
  };
}
