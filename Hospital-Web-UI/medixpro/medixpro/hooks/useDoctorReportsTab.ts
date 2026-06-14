"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ReportActivityItem } from "@/components/doctor/doctor-recent-report-activity";
import type { ReportInsightMetrics } from "@/components/doctor/doctor-report-insights";
import type { DoctorReportRow } from "@/components/doctor/doctor-reports-table";
import {
  DOCTOR_REPORTS_PAGE_SIZE_OPTIONS,
  fetchDoctorReportsDashboard,
  type DoctorReportsPageSize,
} from "@/lib/api/doctor-reports-dashboard";
import { mapDoctorReportsDashboard } from "@/lib/doctor/mapDoctorReportsDashboard";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { useAuth } from "@/lib/authContext";

const POLL_INTERVAL_MS = 30_000;

const EMPTY_INSIGHTS: ReportInsightMetrics = {
  readyForReview: 0,
  reviewedToday: 0,
  pendingUpload: 0,
  reportsReceivedToday: 0,
};

export type UseDoctorReportsTabOptions = {
  enabled?: boolean;
};

export type UseDoctorReportsTabResult = {
  reports: DoctorReportRow[];
  insights: ReportInsightMetrics;
  activity: ReportActivityItem[];
  totalCount: number;
  page: number;
  pageSize: DoctorReportsPageSize;
  pageSizeOptions: readonly DoctorReportsPageSize[];
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: DoctorReportsPageSize) => void;
  refetch: () => Promise<void>;
};

export function useDoctorReportsTab(
  options?: UseDoctorReportsTabOptions,
): UseDoctorReportsTabResult {
  const enabled = options?.enabled ?? true;
  const { sessionChecked, isAuthenticated } = useAuth();
  const [reports, setReports] = useState<DoctorReportRow[]>([]);
  const [insights, setInsights] = useState<ReportInsightMetrics>(EMPTY_INSIGHTS);
  const [activity, setActivity] = useState<ReportActivityItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<DoctorReportsPageSize>(10);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef<{ doctorId: string; clinicId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!sessionChecked || !isAuthenticated || !enabled) return;

    let clinicId = contextRef.current?.clinicId;
    if (!clinicId) {
      const ctx = await resolveDoctorContext();
      if (!ctx.isReady) {
        setError("Unable to resolve doctor or clinic context.");
        setLoading(false);
        return;
      }
      contextRef.current = { doctorId: ctx.doctorId, clinicId: ctx.clinicId };
      clinicId = ctx.clinicId;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchDoctorReportsDashboard({
        clinicId,
        page,
        pageSize,
        signal: controller.signal,
      });
      const mapped = mapDoctorReportsDashboard(data);
      setReports(mapped.reports);
      setInsights(mapped.insights);
      setActivity(mapped.activity);
      setTotalCount(mapped.totalCount);
      setError(null);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Unable to load reports data.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [sessionChecked, isAuthenticated, enabled, page, pageSize]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !enabled) {
      if (!enabled) {
        setLoading(false);
      }
      return;
    }

    void refetch();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [sessionChecked, isAuthenticated, enabled, refetch]);

  const handleSetPageSize = useCallback((size: DoctorReportsPageSize) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    reports,
    insights,
    activity,
    totalCount,
    page,
    pageSize,
    pageSizeOptions: DOCTOR_REPORTS_PAGE_SIZE_OPTIONS,
    loading,
    isRefreshing,
    error,
    setPage,
    setPageSize: handleSetPageSize,
    refetch,
  };
}
