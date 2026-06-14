"use client";

import { cn } from "@/lib/utils";

export type PracticeMetrics = {
  patientsToday: number;
  patientsThisWeek: number;
  patientVisitsThisMonth: number;
  followUpsCompleted: number;
  consultationsCompleted: number;
};

type MetricChip = {
  key: keyof PracticeMetrics;
  label: string;
  className: string;
};

const METRIC_CHIPS: MetricChip[] = [
  {
    key: "patientsToday",
    label: "Patients Today",
    className: "border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40",
  },
  {
    key: "patientsThisWeek",
    label: "Patients This Week",
    className: "border-sky-100 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/40",
  },
  {
    key: "patientVisitsThisMonth",
    label: "Patient Visits This Month",
    className: "border-violet-100 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/40",
  },
  {
    key: "followUpsCompleted",
    label: "Follow-Ups Completed",
    className: "border-amber-100 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
  },
  {
    key: "consultationsCompleted",
    label: "Consultations Completed",
    className: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
  },
];

type DoctorPracticeOverviewMetricsProps = {
  metrics: PracticeMetrics;
};

export function DoctorPracticeOverviewMetrics({ metrics }: DoctorPracticeOverviewMetricsProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Practice Metrics</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {METRIC_CHIPS.map(({ key, label, className }) => (
          <div key={key} className={cn("rounded-lg border px-4 py-3", className)}>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{metrics[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
