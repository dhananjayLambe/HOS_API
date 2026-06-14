"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type PatientInsightMetrics = {
  patientsSeenToday: number;
  followUpDue: number;
  treatmentOngoing: number;
  pendingReports: number;
};

type MetricRow = {
  label: string;
  value: number;
  className?: string;
};

type DoctorPatientInsightsPanelProps = {
  insights: PatientInsightMetrics;
  loading?: boolean;
};

export function DoctorPatientInsightsPanel({ insights, loading }: DoctorPatientInsightsPanelProps) {
  const metricRows: MetricRow[] = [
    {
      label: "Patients Seen Today",
      value: insights.patientsSeenToday,
      className: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Follow-up Due",
      value: insights.followUpDue,
      className: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Treatment Ongoing",
      value: insights.treatmentOngoing,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Reports",
      value: insights.pendingReports,
      className: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Insights</CardTitle>
        <CardDescription>Summary of your patient relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-10" />
              </div>
            ))
          : metricRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("text-lg font-semibold tabular-nums", row.className)}>
                  {row.value}
                </span>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
