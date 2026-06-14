"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDoctorPendingReportsCount } from "@/lib/api/doctor-reports";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { useAuth } from "@/lib/authContext";

const POLL_INTERVAL_MS = 30_000;

export type UseDoctorPendingReportsResult = {
  pendingReports: number;
  loading: boolean;
  error: string | null;
};

export function useDoctorPendingReports(): UseDoctorPendingReportsResult {
  const { sessionChecked, isAuthenticated } = useAuth();
  const [pendingReports, setPendingReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<{ doctorId: string; clinicId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    if (!sessionChecked || !isAuthenticated) return;

    let doctorId = contextRef.current?.doctorId;
    let clinicId = contextRef.current?.clinicId;

    if (!doctorId || !clinicId) {
      const ctx = await resolveDoctorContext();
      if (!ctx.isReady) {
        setError("Unable to resolve doctor or clinic context.");
        setLoading(false);
        return;
      }
      contextRef.current = { doctorId: ctx.doctorId, clinicId: ctx.clinicId };
      doctorId = ctx.doctorId;
      clinicId = ctx.clinicId;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const count = await fetchDoctorPendingReportsCount({
        doctorId,
        clinicId,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setPendingReports(count);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Unable to load pending reports.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [sessionChecked, isAuthenticated]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated) {
      setLoading(false);
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
  }, [sessionChecked, isAuthenticated, refetch]);

  return { pendingReports, loading, error };
}
