"use client";

import { Button } from "@/components/ui/button";
import { DoctorScheduleAppointmentsList, type ScheduleAppointmentRow } from "@/components/doctor/doctor-schedule-appointments-list";
import { DoctorScheduleMetricsStrip, type ScheduleMetrics } from "@/components/doctor/doctor-schedule-metrics-strip";
import {
  DoctorScheduleQueuePanel,
  type ScheduleQueueSnapshot,
  type ScheduleQueueTokenRow,
} from "@/components/doctor/doctor-schedule-queue-panel";

export type DoctorScheduleTabProps = {
  metrics: ScheduleMetrics;
  appointments: ScheduleAppointmentRow[];
  queueSnapshot: ScheduleQueueSnapshot;
  queueTokens: ScheduleQueueTokenRow[];
  totalAppointments?: number;
  loading?: boolean;
  error?: string | null;
  metricsError?: string | null;
  onRetry?: () => void;
};

export function DoctorScheduleTab({
  metrics,
  appointments,
  queueSnapshot,
  queueTokens,
  totalAppointments,
  loading,
  error,
  metricsError,
  onRetry,
}: DoctorScheduleTabProps) {
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Unable to load schedule data.</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metricsError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Schedule summary counts may be incomplete: {metricsError}
        </div>
      ) : null}
      <div>
        <h3 className="mb-3 text-2xl font-semibold tracking-tight">Schedule Summary</h3>
        <DoctorScheduleMetricsStrip metrics={metrics} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorScheduleAppointmentsList
            appointments={appointments}
            totalAppointments={totalAppointments}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-3">
          <DoctorScheduleQueuePanel snapshot={queueSnapshot} tokens={queueTokens} loading={loading} />
        </div>
      </div>
    </div>
  );
}
