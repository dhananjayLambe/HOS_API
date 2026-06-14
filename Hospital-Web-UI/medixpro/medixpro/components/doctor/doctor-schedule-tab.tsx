"use client";

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
};

export function DoctorScheduleTab({
  metrics,
  appointments,
  queueSnapshot,
  queueTokens,
}: DoctorScheduleTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Schedule Summary</h3>
        <DoctorScheduleMetricsStrip metrics={metrics} />
      </div>

      <div className="grid gap-4 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorScheduleAppointmentsList appointments={appointments} />
        </div>
        <div className="lg:col-span-3">
          <DoctorScheduleQueuePanel snapshot={queueSnapshot} tokens={queueTokens} />
        </div>
      </div>
    </div>
  );
}
