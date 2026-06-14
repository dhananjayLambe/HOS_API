"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getAppointments } from "@/lib/api/appointments";
import {
  fetchClinicalVisitsList,
  fetchClinicalVisitsSummary,
  type ClinicalVisitsSummaryResponse,
} from "@/lib/api/visits";
import type { Appointment, MockDoctor } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { checkInHelpdeskAppointment } from "@/lib/helpdesk/checkInAppointment";
import { mapAppointmentListApiRow } from "@/lib/helpdesk/mapAppointmentListRow";
import { defaultDateRange, mapVisitListRow, type HelpdeskVisitRow } from "@/lib/helpdesk/mapVisitListRow";
import type { VisitsPageView } from "@/components/helpdesk/visits/VisitsSummaryCards";
import axiosClient from "@/lib/axiosClient";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const POLL_INTERVAL_MS = 30_000;

export type HelpdeskVisitsFilterState = {
  doctorId: string;
  fromDate: string;
  toDate: string;
  visitType: string;
  status: string;
};

const { fromDate: defaultFrom, toDate: defaultTo } = defaultDateRange();

export const DEFAULT_VISITS_FILTERS: HelpdeskVisitsFilterState = {
  doctorId: "",
  fromDate: defaultFrom,
  toDate: defaultTo,
  visitType: "",
  status: "",
};

const EMPTY_SUMMARY: ClinicalVisitsSummaryResponse = {
  today_visits: 0,
  completed_visits: 0,
  followups: 0,
};

type HelpdeskContextApi = {
  clinic_id: string;
  doctor_id: string;
  doctors: Array<{ id: string; name: string; specialization?: string }>;
};

export function useHelpdeskVisitsList() {
  const [viewMode, setViewMode] = useState<VisitsPageView>("visits");
  const [filters, setFilters] = useState<HelpdeskVisitsFilterState>(DEFAULT_VISITS_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<HelpdeskVisitRow[]>([]);
  const [upcomingRows, setUpcomingRows] = useState<Appointment[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<ClinicalVisitsSummaryResponse>(EMPTY_SUMMARY);
  const [doctors, setDoctors] = useState<MockDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const initialLoadedRef = useRef(false);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_VISITS_FILTERS);
    setSearchInput("");
    setPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoctorsLoading(true);
      try {
        const { data } = await axiosClient.get<HelpdeskContextApi>("/queue/helpdesk/context/");
        if (cancelled) return;
        setDoctors(
          (data.doctors ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            specialization: d.specialization ?? "",
          })),
        );
        setClinicId(data.clinic_id ?? null);
      } catch {
        if (!cancelled) setDoctors([]);
      } finally {
        if (!cancelled) setDoctorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadUpcoming = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const params: Record<string, string> = { section: "secondary" };
        if (clinicId?.trim()) params.clinic_id = clinicId.trim();
        if (filters.doctorId.trim()) params.doctor_id = filters.doctorId.trim();
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const res = await getAppointments(params, { signal });
        if (signal?.aborted) return;
        if (res.status >= 200 && res.status < 300 && Array.isArray(res.data?.results)) {
          const mapped = res.data.results.map((row) => mapAppointmentListApiRow(row));
          setUpcomingRows(mapped);
          setUpcomingCount(mapped.length);
        } else {
          setUpcomingRows([]);
          setUpcomingCount(0);
        }
      } catch (err) {
        if (axios.isCancel(err) || signal?.aborted) return;
        setUpcomingRows([]);
        setUpcomingCount(0);
      }
    },
    [clinicId, filters.doctorId, debouncedSearch],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const isInitial = !initialLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        if (viewMode === "upcoming") {
          await loadUpcoming(signal);
          if (!signal?.aborted) {
            const summaryRes = await fetchClinicalVisitsSummary({ signal });
            if (!signal?.aborted) setSummary(summaryRes);
          }
          initialLoadedRef.current = true;
          return;
        }

        const [listRes, summaryRes, upcomingRes] = await Promise.all([
          fetchClinicalVisitsList(
            {
              search: debouncedSearch.trim() || undefined,
              from_date: filters.fromDate || undefined,
              to_date: filters.toDate || undefined,
              doctor_id: filters.doctorId || undefined,
              visit_type: filters.visitType || undefined,
              status: filters.status || undefined,
              page,
              page_size: pageSize,
            },
            { signal },
          ),
          fetchClinicalVisitsSummary({ signal }),
          getAppointments(
            {
              section: "secondary",
              clinic_id: clinicId?.trim() || undefined,
              doctor_id: filters.doctorId.trim() || undefined,
              search: debouncedSearch.trim() || undefined,
            },
            { signal },
          ),
        ]);
        if (signal?.aborted) return;
        setRows(listRes.results.map(mapVisitListRow));
        setTotal(listRes.total);
        setTotalPages(listRes.total_pages);
        setSummary(summaryRes);
        if (
          upcomingRes.status >= 200 &&
          upcomingRes.status < 300 &&
          Array.isArray(upcomingRes.data?.results)
        ) {
          const mapped = upcomingRes.data.results.map((row) => mapAppointmentListApiRow(row));
          setUpcomingRows(mapped);
          setUpcomingCount(mapped.length);
        }
        initialLoadedRef.current = true;
      } catch (err) {
        if (axios.isCancel(err) || signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load visits.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [debouncedSearch, filters, page, pageSize, viewMode, clinicId, loadUpcoming],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, pageSize, viewMode]);

  useEffect(() => {
    const id = window.setInterval(refetch, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

  const checkInUpcomingAppointment = useCallback(
    async (appointmentId: string) => {
      setCheckingInId(appointmentId);
      try {
        const data = await checkInHelpdeskAppointment(appointmentId);
        await loadUpcoming();
        refetch();
        return data;
      } finally {
        setCheckingInId(null);
      }
    },
    [loadUpcoming, refetch],
  );

  return {
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
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    rows,
    upcomingRows,
    upcomingCount,
    total,
    totalPages,
    summary,
    doctors,
    doctorsLoading,
    clinicId,
    loading,
    isRefreshing,
    error,
    refetch,
    resetFilters,
    showInitialSkeleton: loading && !initialLoadedRef.current,
    checkingInId,
    checkInUpcomingAppointment,
  };
}
