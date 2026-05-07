"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { fetchPatientList, type PatientListFilter, type PatientListResponse } from "@/lib/api/patients";

const DEBOUNCE_MS = 300;

export function usePatientList(pageSize = 20) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = searchParams.get("q") || "";
  const filterFromUrl = (searchParams.get("filter") as PatientListFilter) || "recent";
  const pageFromUrl = Number(searchParams.get("page") || "1");

  const [qInput, setQInput] = useState(qFromUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PatientListResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQInput(qFromUrl);
  }, [qFromUrl]);

  const effectivePage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
  const effectiveFilter: PatientListFilter = ["recent", "today", "follow_up_due", "has_active_rx"].includes(filterFromUrl)
    ? filterFromUrl
    : "recent";

  const syncUrl = (next: { q?: string; filter?: PatientListFilter; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    const q = next.q ?? qFromUrl;
    const filter = next.filter ?? effectiveFilter;
    const page = next.page ?? effectivePage;

    if (q) params.set("q", q);
    else params.delete("q");

    if (filter && filter !== "recent") params.set("filter", filter);
    else params.delete("filter");

    if (page > 1) params.set("page", String(page));
    else params.delete("page");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (qInput !== qFromUrl) {
        syncUrl({ q: qInput, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [qInput, qFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const runImmediateSearch = () => {
    syncUrl({ q: qInput, page: 1 });
  };

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    fetchPatientList({
      q: qFromUrl,
      filter: effectiveFilter,
      page: effectivePage,
      pageSize,
      signal: controller.signal,
    })
      .then((resp) => setData(resp))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (isAxiosError(err) && err.code === "ERR_CANCELED") return;
        setError("Failed to load patients. Please retry.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [qFromUrl, effectiveFilter, effectivePage, pageSize]);

  const result = useMemo(
    () => ({
      qInput,
      setQInput,
      runImmediateSearch,
      data,
      isLoading,
      error,
      filter: effectiveFilter,
      page: effectivePage,
      setFilter: (next: PatientListFilter) => syncUrl({ filter: next, page: 1 }),
      setPage: (next: number) => syncUrl({ page: next }),
      resetFilters: () => syncUrl({ filter: "recent", page: 1 }),
    }),
    [qInput, data, isLoading, error, effectiveFilter, effectivePage],
  );

  return result;
}
