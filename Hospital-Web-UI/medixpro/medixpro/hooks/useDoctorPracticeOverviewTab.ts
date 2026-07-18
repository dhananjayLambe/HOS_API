"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import type { PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import type { PracticeSummary } from "@/components/doctor/doctor-practice-summary";
import type { RecentTrendRow } from "@/components/doctor/doctor-recent-trends";
import { fetchDoctorPracticeOverviewDashboard } from "@/lib/api/doctor-practice-overview-dashboard";
import { mapDoctorPracticeOverviewDashboard } from "@/lib/doctor/mapDoctorPracticeOverviewDashboard";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { useAuth } from "@/lib/authContext";

const POLL_INTERVAL_MS = 30_000;

const EMPTY_METRICS: PracticeMetrics = {
  patientsToday: 0,
  patientsThisWeek: 0,
  patientVisitsThisMonth: 0,
  followUpsCompleted: 0,
  consultationsCompleted: 0,
};

const EMPTY_MIX: ConsultationMix = {
  newConsultations: 0,
  followUpConsultations: 0,
  cancelled: 0,
  noShow: 0,
};

const EMPTY_SUMMARY: PracticeSummary = {
  newPatients: 0,
  returningPatients: 0,
  activeTreatments: 0,
  patientsUnderTreatment: 0,
};

export type UseDoctorPracticeOverviewTabOptions = {
  enabled?: boolean;
};

export type UseDoctorPracticeOverviewTabResult = {
  metrics: PracticeMetrics;
  consultationMix: ConsultationMix;
  summary: PracticeSummary;
  recentTrends: RecentTrendRow[];
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useDoctorPracticeOverviewTab(
  options?: UseDoctorPracticeOverviewTabOptions,
): UseDoctorPracticeOverviewTabResult {
  const enabled = options?.enabled ?? true;
  const { sessionChecked, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<PracticeMetrics>(EMPTY_METRICS);
  const [consultationMix, setConsultationMix] = useState<ConsultationMix>(EMPTY_MIX);
  const [summary, setSummary] = useState<PracticeSummary>(EMPTY_SUMMARY);
  const [recentTrends, setRecentTrends] = useState<RecentTrendRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef<{ clinicId: string } | null>(null);
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
      contextRef.current = { clinicId: ctx.clinicId };
      clinicId = ctx.clinicId;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }

    try {
      const data = await fetchDoctorPracticeOverviewDashboard({
        clinicId,
        signal: controller.signal,
      });
      const mapped = mapDoctorPracticeOverviewDashboard(data);
      setMetrics(mapped.metrics);
      setConsultationMix(mapped.consultationMix);
      setSummary(mapped.summary);
      setRecentTrends(mapped.recentTrends);
      setGeneratedAt(mapped.generatedAt);
      setError(null);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unable to load practice overview data.";
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [sessionChecked, isAuthenticated, enabled]);

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

  return {
    metrics,
    consultationMix,
    summary,
    recentTrends,
    generatedAt,
    loading,
    error,
    refetch,
  };
}
