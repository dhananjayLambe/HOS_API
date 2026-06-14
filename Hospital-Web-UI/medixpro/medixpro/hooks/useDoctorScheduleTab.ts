"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ScheduleAppointmentRow } from "@/components/doctor/doctor-schedule-appointments-list";
import type { ScheduleMetrics } from "@/components/doctor/doctor-schedule-metrics-strip";
import type {
  ScheduleQueueSnapshot,
  ScheduleQueueTokenRow,
} from "@/components/doctor/doctor-schedule-queue-panel";
import {
  fetchDoctorAppointmentsToday,
  fetchDoctorQueueToday,
} from "@/lib/api/doctor-appointments";
import { mapDoctorAppointmentsResponse } from "@/lib/doctor/mapDoctorScheduleData";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { useAuth } from "@/lib/authContext";

const POLL_INTERVAL_MS = 30_000;

const EMPTY_METRICS: ScheduleMetrics = {
  scheduled: 0,
  completed: 0,
  waiting: 0,
  cancelled: 0,
  noShow: 0,
};

const EMPTY_SNAPSHOT: ScheduleQueueSnapshot = {
  waiting: 0,
  vitalsDone: 0,
  inConsultation: 0,
};

export type UseDoctorScheduleTabResult = {
  metrics: ScheduleMetrics;
  appointments: ScheduleAppointmentRow[];
  queueSnapshot: ScheduleQueueSnapshot;
  queueTokens: ScheduleQueueTokenRow[];
  totalAppointments: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useDoctorScheduleTab(): UseDoctorScheduleTabResult {
  const { sessionChecked, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<ScheduleMetrics>(EMPTY_METRICS);
  const [appointments, setAppointments] = useState<ScheduleAppointmentRow[]>([]);
  const [queueSnapshot, setQueueSnapshot] = useState<ScheduleQueueSnapshot>(EMPTY_SNAPSHOT);
  const [queueTokens, setQueueTokens] = useState<ScheduleQueueTokenRow[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const contextRef = useRef<{ doctorId: string; clinicId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async (options?: { showLoading?: boolean }) => {
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

    const showLoading = options?.showLoading ?? !hasLoadedOnceRef.current;
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const [appointmentsRes, queueRows] = await Promise.all([
        fetchDoctorAppointmentsToday({
          doctorId: doctorId!,
          clinicId: clinicId!,
          signal: controller.signal,
        }),
        fetchDoctorQueueToday({
          doctorId: doctorId!,
          clinicId: clinicId!,
          signal: controller.signal,
        }),
      ]);

      const mapped = mapDoctorAppointmentsResponse(
        appointmentsRes.appointments ?? [],
        queueRows,
        appointmentsRes.total_appointments ?? 0
      );

      setMetrics(mapped.metrics);
      setAppointments(mapped.appointments);
      setQueueSnapshot(mapped.queueSnapshot);
      setQueueTokens(mapped.queueTokens);
      setTotalAppointments(mapped.totalAppointments);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unable to load schedule data.";
      setError(message);
    } finally {
      if (!controller.signal.aborted && showLoading) {
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
      void refetch();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [sessionChecked, isAuthenticated, refetch]);

  return {
    metrics,
    appointments,
    queueSnapshot,
    queueTokens,
    totalAppointments,
    loading,
    error,
    refetch: () => refetch({ showLoading: true }),
  };
}
