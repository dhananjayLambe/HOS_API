"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PatientInsightMetrics } from "@/components/doctor/doctor-patient-insights-panel";
import type { FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import type { RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";
import {
  DOCTOR_PATIENTS_PAGE_SIZE_OPTIONS,
  fetchDoctorPatientsDashboard,
  type DoctorPatientsPageSize,
} from "@/lib/api/doctor-patients-dashboard";
import { mapDoctorPatientsDashboard } from "@/lib/doctor/mapDoctorPatientsDashboard";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { useAuth } from "@/lib/authContext";

const POLL_INTERVAL_MS = 30_000;

const EMPTY_INSIGHTS: PatientInsightMetrics = {
  patientsSeenToday: 0,
  followUpDue: 0,
  treatmentOngoing: 0,
  pendingReports: 0,
};

export type UseDoctorPatientsTabOptions = {
  enabled?: boolean;
};

export type UseDoctorPatientsTabResult = {
  patients: RecentPatientRow[];
  insights: PatientInsightMetrics;
  followUpPatients: FollowUpPatientRow[];
  totalCount: number;
  page: number;
  pageSize: DoctorPatientsPageSize;
  pageSizeOptions: readonly DoctorPatientsPageSize[];
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: DoctorPatientsPageSize) => void;
  refetch: () => Promise<void>;
};

export function useDoctorPatientsTab(
  options?: UseDoctorPatientsTabOptions,
): UseDoctorPatientsTabResult {
  const enabled = options?.enabled ?? true;
  const { sessionChecked, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<RecentPatientRow[]>([]);
  const [insights, setInsights] = useState<PatientInsightMetrics>(EMPTY_INSIGHTS);
  const [followUpPatients, setFollowUpPatients] = useState<FollowUpPatientRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<DoctorPatientsPageSize>(10);
  const [loading, setLoading] = useState(true);
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

    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }

    try {
      const data = await fetchDoctorPatientsDashboard({
        clinicId,
        page,
        pageSize,
        signal: controller.signal,
      });
      const mapped = mapDoctorPatientsDashboard(data);
      setPatients(mapped.patients);
      setInsights(mapped.insights);
      setFollowUpPatients(mapped.followUpPatients);
      setTotalCount(mapped.totalCount);
      setError(null);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Unable to load patients data.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [sessionChecked, isAuthenticated, enabled, page, pageSize]);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }
    if (!isAuthenticated || !enabled) {
      if (!enabled || !isAuthenticated) {
        setLoading(false);
      }
      if (sessionChecked && !isAuthenticated) {
        setError("Sign in required to load dashboard data.");
      }
      return;
    }

    void refetch();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [sessionChecked, isAuthenticated, enabled, refetch]);

  const handleSetPageSize = useCallback((size: DoctorPatientsPageSize) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    patients,
    insights,
    followUpPatients,
    totalCount,
    page,
    pageSize,
    pageSizeOptions: DOCTOR_PATIENTS_PAGE_SIZE_OPTIONS,
    loading,
    error,
    setPage,
    setPageSize: handleSetPageSize,
    refetch,
  };
}
