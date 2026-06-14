"use client";

import { cn } from "@/lib/utils";

export type ScheduleMetrics = {
  scheduled: number;
  completed: number;
  waiting: number;
  cancelled: number;
  noShow: number;
};

type MetricChip = {
  key: keyof ScheduleMetrics;
  label: string;
  className: string;
};

const METRIC_CHIPS: MetricChip[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    className: "border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40",
  },
  {
    key: "completed",
    label: "Completed",
    className: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
  },
  {
    key: "waiting",
    label: "Waiting",
    className: "border-amber-100 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    className: "border-slate-200 bg-muted/50 dark:border-slate-800",
  },
  {
    key: "noShow",
    label: "No Show",
    className: "border-slate-200 bg-muted/50 dark:border-slate-800",
  },
];

type DoctorScheduleMetricsStripProps = {
  metrics: ScheduleMetrics;
};

export function DoctorScheduleMetricsStrip({ metrics }: DoctorScheduleMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {METRIC_CHIPS.map(({ key, label, className }) => (
        <div
          key={key}
          className={cn("rounded-lg border px-4 py-3", className)}
        >
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{metrics[key]}</p>
        </div>
      ))}
    </div>
  );
}
